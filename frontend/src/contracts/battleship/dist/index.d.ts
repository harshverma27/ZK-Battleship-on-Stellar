import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from "@stellar/stellar-sdk/contract";
import type { u32 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CBKJPCU7KI4MNAUS6P44SHNIFSZ2VQUNDJOM7ZUFE37UFKN2XA3BPG2K";
    };
};
/**
 * A single move record
 */
export interface Move {
    attacker: string;
    hit: boolean;
    proof_hash: Buffer;
    x: u32;
    y: u32;
}
export declare const Errors: {
    1: {
        message: string;
    };
    2: {
        message: string;
    };
    3: {
        message: string;
    };
    4: {
        message: string;
    };
    5: {
        message: string;
    };
    6: {
        message: string;
    };
    7: {
        message: string;
    };
    8: {
        message: string;
    };
    9: {
        message: string;
    };
    10: {
        message: string;
    };
    11: {
        message: string;
    };
};
/**
 * Storage keys
 */
export type DataKey = {
    tag: "GameCount";
    values: void;
} | {
    tag: "Game";
    values: readonly [u32];
} | {
    tag: "GameMoves";
    values: readonly [u32];
} | {
    tag: "HitMap";
    values: readonly [u32, u32];
};
/**
 * Full game state
 */
export interface GameState {
    current_turn: u32;
    game_id: u32;
    move_count: u32;
    p1_board_hash: Buffer;
    p1_hits: u32;
    p2_board_hash: Buffer;
    p2_hits: u32;
    player1: string;
    player2: string;
    status: GameStatus;
    winner: u32;
}
/**
 * Game status enum
 */
export type GameStatus = {
    tag: "Waiting";
    values: void;
} | {
    tag: "Placing";
    values: void;
} | {
    tag: "Active";
    values: void;
} | {
    tag: "Complete";
    values: void;
};
export interface Client {
    /**
     * Construct and simulate a attack transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Submit an attack. The defending player calls this with their ZK proof.
     *
     * Flow:
     * 1. Attacker clicks a cell (off-chain signal to defender via polling)
     * 2. Defender generates ZK proof and calls attack() with proof
     * 3. Contract verifies and updates state
     */
    attack: ({ game_id, attacker, x, y, hit, proof_hash }: {
        game_id: u32;
        attacker: string;
        x: u32;
        y: u32;
        hit: boolean;
        proof_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>;
    /**
     * Construct and simulate a get_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get the current game state for polling.
     */
    get_game: ({ game_id }: {
        game_id: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<GameState>>>;
    /**
     * Construct and simulate a get_moves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get all moves for a game.
     */
    get_moves: ({ game_id }: {
        game_id: u32;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<Move>>>>;
    /**
     * Construct and simulate a join_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Join an existing game as player 2.
     */
    join_game: ({ game_id, player2 }: {
        game_id: u32;
        player2: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a game_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get the total number of games created.
     */
    game_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a create_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Create a new game. Returns the game_id.
     */
    create_game: ({ player1 }: {
        player1: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a commit_board transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Commit a board hash. Both players must do this before the game starts.
     */
    commit_board: ({ game_id, player, board_hash }: {
        game_id: u32;
        player: string;
        board_hash: Buffer;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        attack: (json: string) => AssembledTransaction<Result<boolean, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_game: (json: string) => AssembledTransaction<Result<GameState, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_moves: (json: string) => AssembledTransaction<Result<Move[], import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        join_game: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        game_count: (json: string) => AssembledTransaction<number>;
        create_game: (json: string) => AssembledTransaction<number>;
        commit_board: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
    };
}
