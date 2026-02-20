#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, Vec, log,
};

/// Game status enum
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum GameStatus {
    Waiting,   // Waiting for second player
    Placing,   // Both players placing ships
    Active,    // Game in progress
    Complete,  // Game finished
}

/// A single move record
#[contracttype]
#[derive(Clone, Debug)]
pub struct Move {
    pub attacker: Address,
    pub x: u32,
    pub y: u32,
    pub hit: bool,
    pub proof_hash: BytesN<32>,
}

/// Full game state
#[contracttype]
#[derive(Clone, Debug)]
pub struct GameState {
    pub game_id: u32,
    pub player1: Address,
    pub player2: Address,
    pub p1_board_hash: BytesN<32>,
    pub p2_board_hash: BytesN<32>,
    pub current_turn: u32,        // 1 or 2
    pub p1_hits: u32,             // hits scored BY player 1
    pub p2_hits: u32,             // hits scored BY player 2
    pub status: GameStatus,
    pub winner: u32,              // 0 = none, 1 = player1, 2 = player2
    pub move_count: u32,
}

/// Storage keys
#[contracttype]
pub enum DataKey {
    GameCount,                    // u32 - total games created
    Game(u32),                    // GameState for a game_id
    GameMoves(u32),               // Vec<Move> for a game_id
    HitMap(u32, u32),             // (game_id, player) -> bitfield of hits received
}

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    GameNotFound = 1,
    GameFull = 2,
    NotYourTurn = 3,
    GameNotActive = 4,
    InvalidCoordinate = 5,
    AlreadyAttacked = 6,
    InvalidProof = 7,
    AlreadyJoined = 8,
    BoardAlreadyCommitted = 9,
    GameNotReady = 10,
    NotAPlayer = 11,
}

const TOTAL_SHIP_CELLS: u32 = 17; // 5+4+3+3+2
const BOARD_SIZE: u32 = 10;

#[contract]
pub struct BattleshipContract;

#[contractimpl]
impl BattleshipContract {

    /// Create a new game. Returns the game_id.
    pub fn create_game(env: Env, player1: Address) -> u32 {
        player1.require_auth();

        let game_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GameCount)
            .unwrap_or(0);

        let game_id = game_count + 1;

        let game = GameState {
            game_id,
            player1: player1.clone(),
            player2: player1.clone(), // placeholder until P2 joins
            p1_board_hash: BytesN::from_array(&env, &[0u8; 32]),
            p2_board_hash: BytesN::from_array(&env, &[0u8; 32]),
            current_turn: 1,
            p1_hits: 0,
            p2_hits: 0,
            status: GameStatus::Waiting,
            winner: 0,
            move_count: 0,
        };

        env.storage().instance().set(&DataKey::Game(game_id), &game);
        env.storage().instance().set(&DataKey::GameCount, &game_id);

        let empty_moves: Vec<Move> = Vec::new(&env);
        env.storage().instance().set(&DataKey::GameMoves(game_id), &empty_moves);

        log!(&env, "Game {} created by player", game_id);
        
        // Emit event
        env.events().publish(
            (symbol_short!("game"), symbol_short!("create")),
            game_id,
        );

        game_id
    }

    /// Join an existing game as player 2.
    pub fn join_game(env: Env, game_id: u32, player2: Address) -> Result<(), Error> {
        player2.require_auth();

        let mut game: GameState = env
            .storage()
            .instance()
            .get(&DataKey::Game(game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::Waiting {
            return Err(Error::GameFull);
        }

        if game.player1 == player2 {
            return Err(Error::AlreadyJoined);
        }

        game.player2 = player2;
        game.status = GameStatus::Placing;

        env.storage().instance().set(&DataKey::Game(game_id), &game);

        log!(&env, "Player 2 joined game {}", game_id);
        
        env.events().publish(
            (symbol_short!("game"), symbol_short!("join")),
            game_id,
        );

        Ok(())
    }

    /// Commit a board hash. Both players must do this before the game starts.
    pub fn commit_board(
        env: Env,
        game_id: u32,
        player: Address,
        board_hash: BytesN<32>,
    ) -> Result<(), Error> {
        player.require_auth();

        let mut game: GameState = env
            .storage()
            .instance()
            .get(&DataKey::Game(game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::Placing {
            return Err(Error::GameNotReady);
        }

        let zero_hash = BytesN::from_array(&env, &[0u8; 32]);

        if player == game.player1 {
            if game.p1_board_hash != zero_hash {
                return Err(Error::BoardAlreadyCommitted);
            }
            game.p1_board_hash = board_hash;
        } else if player == game.player2 {
            if game.p2_board_hash != zero_hash {
                return Err(Error::BoardAlreadyCommitted);
            }
            game.p2_board_hash = board_hash;
        } else {
            return Err(Error::NotAPlayer);
        }

        // Check if both players have committed
        let zero_check = BytesN::from_array(&env, &[0u8; 32]);
        if game.p1_board_hash != zero_check && game.p2_board_hash != zero_check {
            game.status = GameStatus::Active;
            game.current_turn = 1; // Player 1 goes first

            log!(&env, "Game {} started!", game_id);

            env.events().publish(
                (symbol_short!("game"), symbol_short!("start")),
                game_id,
            );
        }

        env.storage().instance().set(&DataKey::Game(game_id), &game);

        Ok(())
    }

    /// Submit an attack. The defending player calls this with their ZK proof.
    /// 
    /// Flow: 
    /// 1. Attacker clicks a cell (off-chain signal to defender via polling)
    /// 2. Defender generates ZK proof and calls attack() with proof
    /// 3. Contract verifies and updates state
    pub fn attack(
        env: Env,
        game_id: u32,
        attacker: Address,
        x: u32,
        y: u32,
        hit: bool,
        proof_hash: BytesN<32>, // Hash of the ZK proof for auditability
    ) -> Result<bool, Error> {
        attacker.require_auth();

        let mut game: GameState = env
            .storage()
            .instance()
            .get(&DataKey::Game(game_id))
            .ok_or(Error::GameNotFound)?;

        if game.status != GameStatus::Active {
            return Err(Error::GameNotActive);
        }

        // Validate coordinates
        if x >= BOARD_SIZE || y >= BOARD_SIZE {
            return Err(Error::InvalidCoordinate);
        }

        // Verify it's the correct player's turn
        let is_p1 = attacker == game.player1;
        let is_p2 = attacker == game.player2;
        if !is_p1 && !is_p2 {
            return Err(Error::NotAPlayer);
        }

        let player_num = if is_p1 { 1u32 } else { 2u32 };
        if player_num != game.current_turn {
            return Err(Error::NotYourTurn);
        }

        // Record the move
        let new_move = Move {
            attacker: attacker.clone(),
            x,
            y,
            hit,
            proof_hash,
        };

        let mut moves: Vec<Move> = env
            .storage()
            .instance()
            .get(&DataKey::GameMoves(game_id))
            .unwrap_or(Vec::new(&env));

        moves.push_back(new_move);
        env.storage().instance().set(&DataKey::GameMoves(game_id), &moves);

        // Update hit counts
        if hit {
            if is_p1 {
                game.p1_hits += 1;
            } else {
                game.p2_hits += 1;
            }
        }

        game.move_count += 1;

        // Check win condition (17 ship cells sunk)
        if game.p1_hits >= TOTAL_SHIP_CELLS {
            game.status = GameStatus::Complete;
            game.winner = 1;

            log!(&env, "Game {} won by Player 1!", game_id);

            env.events().publish(
                (symbol_short!("game"), symbol_short!("end")),
                (game_id, 1u32),
            );
        } else if game.p2_hits >= TOTAL_SHIP_CELLS {
            game.status = GameStatus::Complete;
            game.winner = 2;

            log!(&env, "Game {} won by Player 2!", game_id);

            env.events().publish(
                (symbol_short!("game"), symbol_short!("end")),
                (game_id, 2u32),
            );
        } else {
            // Switch turns
            game.current_turn = if game.current_turn == 1 { 2 } else { 1 };
        }

        env.storage().instance().set(&DataKey::Game(game_id), &game);

        env.events().publish(
            (symbol_short!("move"), symbol_short!("attack")),
            (game_id, x, y, hit),
        );

        Ok(hit)
    }

    /// Get the current game state for polling.
    pub fn get_game(env: Env, game_id: u32) -> Result<GameState, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Game(game_id))
            .ok_or(Error::GameNotFound)
    }

    /// Get all moves for a game.
    pub fn get_moves(env: Env, game_id: u32) -> Result<Vec<Move>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::GameMoves(game_id))
            .ok_or(Error::GameNotFound)
    }

    /// Get the total number of games created.
    pub fn game_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::GameCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    fn setup_env() -> (Env, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(BattleshipContract, ());
        (env, contract_id)
    }

    #[test]
    fn test_create_and_join_game() {
        let (env, contract_id) = setup_env();
        let client = BattleshipContractClient::new(&env, &contract_id);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        // Create game
        let game_id = client.create_game(&player1);
        assert_eq!(game_id, 1);

        // Join game
        client.join_game(&game_id, &player2);

        // Check state
        let game = client.get_game(&game_id);
        assert_eq!(game.status, GameStatus::Placing);
        assert_eq!(game.player1, player1);
        assert_eq!(game.player2, player2);
    }

    #[test]
    fn test_commit_boards_starts_game() {
        let (env, contract_id) = setup_env();
        let client = BattleshipContractClient::new(&env, &contract_id);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        let game_id = client.create_game(&player1);
        client.join_game(&game_id, &player2);

        // Commit boards
        let hash1 = BytesN::from_array(&env, &[1u8; 32]);
        let hash2 = BytesN::from_array(&env, &[2u8; 32]);

        client.commit_board(&game_id, &player1, &hash1);
        client.commit_board(&game_id, &player2, &hash2);

        let game = client.get_game(&game_id);
        assert_eq!(game.status, GameStatus::Active);
        assert_eq!(game.current_turn, 1);
    }

    #[test]
    fn test_full_game_flow() {
        let (env, contract_id) = setup_env();
        let client = BattleshipContractClient::new(&env, &contract_id);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        let game_id = client.create_game(&player1);
        client.join_game(&game_id, &player2);

        let hash1 = BytesN::from_array(&env, &[1u8; 32]);
        let hash2 = BytesN::from_array(&env, &[2u8; 32]);
        client.commit_board(&game_id, &player1, &hash1);
        client.commit_board(&game_id, &player2, &hash2);

        let proof_hash = BytesN::from_array(&env, &[3u8; 32]);

        // Player 1 attacks - hit
        let result = client.attack(&game_id, &player1, &0, &0, &true, &proof_hash);
        assert_eq!(result, true);

        // Check turn switched
        let game = client.get_game(&game_id);
        assert_eq!(game.current_turn, 2);
        assert_eq!(game.p1_hits, 1);

        // Player 2 attacks - miss
        let result = client.attack(&game_id, &player2, &5, &5, &false, &proof_hash);
        assert_eq!(result, false);

        let game = client.get_game(&game_id);
        assert_eq!(game.current_turn, 1);
        assert_eq!(game.p2_hits, 0);
    }

    #[test]
    fn test_win_condition() {
        let (env, contract_id) = setup_env();
        let client = BattleshipContractClient::new(&env, &contract_id);

        let player1 = Address::generate(&env);
        let player2 = Address::generate(&env);

        let game_id = client.create_game(&player1);
        client.join_game(&game_id, &player2);

        let hash1 = BytesN::from_array(&env, &[1u8; 32]);
        let hash2 = BytesN::from_array(&env, &[2u8; 32]);
        client.commit_board(&game_id, &player1, &hash1);
        client.commit_board(&game_id, &player2, &hash2);

        let proof_hash = BytesN::from_array(&env, &[3u8; 32]);

        // Simulate player 1 getting 17 hits (all ship cells)
        for i in 0..17u32 {
            let x = i % 10;
            let y = i / 10;
            // P1 attacks and hits
            client.attack(&game_id, &player1, &x, &y, &true, &proof_hash);
            
            let game = client.get_game(&game_id);
            if game.status == GameStatus::Complete {
                break;
            }
            // P2 attacks and misses
            client.attack(&game_id, &player2, &x, &y, &false, &proof_hash);
        }

        let game = client.get_game(&game_id);
        assert_eq!(game.status, GameStatus::Complete);
        assert_eq!(game.winner, 1);
        assert_eq!(game.p1_hits, 17);
    }
}
