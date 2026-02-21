import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import WalletConnect from './components/WalletConnect';
import GameLobby from './components/GameLobby';
import ShipPlacement from './components/ShipPlacement';
import GamePlay from './components/GamePlay';
import GameOver from './components/GameOver';
import { useGameContract } from './hooks/useGameContract';

// Connect to local sync server
// NOTE: For player 2 on another device, they need to connect to Player 1's IP
// We'll use window.location.hostname so it works for whoever is hosting
const SOCKET_URL = `http://${window.location.hostname}:3001`;
const socket = io(SOCKET_URL);

/**
 * Game Phases:
 *   LOBBY      → Connect wallet, create/join game
 *   PLACEMENT  → Place ships on grid, commit hash
 *   WAITING    → Waiting for opponent to commit
 *   PLAYING    → Active gameplay, alternating attacks
 *   GAME_OVER  → Winner determined
 */

const INITIAL_STATE = {
    phase: 'LOBBY',
    walletAddress: null,
    gameId: null,
    roomId: null,
    playerNumber: null,
    myShips: [],
    boardHash: null,
    salt: null,
    currentTurn: 1,    // Turn 1 = Player 1's turn. Odd = P1, Even = P2.
    myHits: 0,
    opponentHits: 0,
    myAttacks: [],
    incomingAttacks: [],
    winner: null,
};

export default function App() {
    const [state, setState] = useState(INITIAL_STATE);
    const [player2Joined, setPlayer2Joined] = useState(false);
    const [pendingCommit, setPendingCommit] = useState(null);
    const isAttackingRef = useRef(false); // Synchronous lock against click spam
    const { createGame, joinGame, commitBoard, attack, loading } = useGameContract();

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Socket.io sync logic
    useEffect(() => {
        socket.on('player_joined', ({ playerNumber }) => {
            if (playerNumber === 2) {
                console.log('[Socket] Player 2 joined!');
                setPlayer2Joined(true);
            }
        });

        socket.on('game_ready', () => {
            console.log('[Socket] Both players ready. Starting match!');
            setState(prev => {
                if (prev.phase === 'WAITING' || prev.phase === 'PLACEMENT') {
                    return { ...prev, phase: 'PLAYING' };
                }
                return prev;
            });
        });

        socket.on('incoming_attack', ({ x, y, hit }) => {
            console.log('[Socket] Incoming attack:', x, y, hit);
            setState(prev => {
                const newIncoming = [...prev.incomingAttacks, { x, y, hit }];
                const newOpponentHits = prev.opponentHits + (hit ? 1 : 0);

                let phase = prev.phase;
                let winner = prev.winner;
                if (newOpponentHits >= 17) {
                    phase = 'GAME_OVER';
                    winner = prev.playerNumber === 1 ? 2 : 1;
                }

                return {
                    ...prev,
                    incomingAttacks: newIncoming,
                    opponentHits: newOpponentHits,
                    currentTurn: prev.currentTurn + 1, // Auto-advance turn
                    phase,
                    winner
                };
            });
        });

        return () => {
            socket.off('player_joined');
            socket.off('game_ready');
            socket.off('incoming_attack');
        };
    }, []);

    const handleWalletConnect = useCallback((address) => {
        updateState({ walletAddress: address });
    }, [updateState]);

    const handleCreateGame = useCallback(async () => {
        try {
            const gameId = await createGame();
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let roomId = '';
            for (let i = 0; i < 6; i++) {
                roomId += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            console.log(`[App] Created game: ${gameId}, Room: ${roomId}`);
            socket.emit('create_room', { roomId, gameId });
            socket.emit('join_game', { gameId, playerNumber: 1 });

            // Show the room code splash screen first
            updateState({ gameId, roomId, playerNumber: 1, phase: 'ROOM_CODE_SPLASH' });

            // After 5 seconds, transition to PLACEMENT
            setTimeout(() => {
                setState(prev => prev.phase === 'ROOM_CODE_SPLASH' ? { ...prev, phase: 'PLACEMENT' } : prev);
            }, 5000);

        } catch (err) {
            alert("Failed to create game. See console.");
        }
    }, [createGame, updateState]);

    const handleJoinGame = useCallback((roomId) => {
        if (!roomId || typeof roomId !== 'string') return;
        const upperRoomId = roomId.trim().toUpperCase();

        socket.emit('lookup_room', upperRoomId, async (res) => {
            if (!res.success) {
                alert("Room not found! Check the code and try again.");
                return;
            }
            try {
                const gameId = res.gameId;
                await joinGame(gameId);
                console.log('[App] Joined game:', gameId, 'via Room:', upperRoomId);
                socket.emit('join_game', { gameId, playerNumber: 2 });
                setPlayer2Joined(true); // I am P2, so P2 is here
                updateState({ gameId, roomId: upperRoomId, playerNumber: 2, phase: 'PLACEMENT' });
            } catch (err) {
                console.error('[App] Join error:', err);
                alert("Failed to join game. Check your wallet connection or see console.");
            }
        });
    }, [joinGame, updateState]);

    const executeCommit = useCallback(async (ships, boardHash, salt) => {
        // Immediately set state so ships are visible in memory and UI goes to WAITING
        updateState({ myShips: ships, boardHash, salt, phase: 'WAITING' });

        try {
            // Wait for Stellar transaction to strictly complete first
            await commitBoard(state.gameId, boardHash);
            console.log('[App] Board committed on chain for game:', state.gameId);

            // Only after transaction confirms do we inform the sync server we are ready
            socket.emit('submit_ships', {
                gameId: state.gameId,
                playerNumber: state.playerNumber,
                ships
            });
        } catch (err) {
            console.error('[App] Failed to commit board on chain:', err);
            alert("Transaction failed or was rejected. See console and try again.");
            // Revert phase to allow retry
            updateState({ phase: 'PLACEMENT' });
        }
    }, [commitBoard, state.gameId, state.playerNumber, updateState]);

    const handleShipsPlaced = useCallback(async (ships, boardHash, salt) => {
        if (state.playerNumber === 1 && !player2Joined) {
            console.log('[App] Buffering ships... Player 2 has not joined yet.');
            setPendingCommit({ ships, boardHash, salt });
            updateState({ myShips: ships, boardHash, salt, phase: 'WAITING' });
            return;
        }

        updateState({ phase: 'WAITING' }); // Optimistic UI
        await executeCommit(ships, boardHash, salt);
    }, [state.playerNumber, player2Joined, updateState, executeCommit]);

    // Effect to flush pending commit when P2 joins
    useEffect(() => {
        if (player2Joined && pendingCommit) {
            console.log('[App] Executing buffered commit now that P2 joined.');
            executeCommit(pendingCommit.ships, pendingCommit.boardHash, pendingCommit.salt);
            setPendingCommit(null);
        }
    }, [player2Joined, pendingCommit, executeCommit]);

    const handleAttack = useCallback(async (x, y) => {
        if (isAttackingRef.current) {
            console.log('[App] Attack ignored (anti-click-spam lock is active)');
            return;
        }
        isAttackingRef.current = true;
        try {
            // First, ask the sync server if it's a hit
            const checkResult = await new Promise(resolve => {
                socket.emit('attack_check', {
                    gameId: state.gameId,
                    attackerNumber: state.playerNumber,
                    x, y
                }, resolve);
            });

            if (checkResult.error) {
                alert(`Sync Error: ${checkResult.error}. Opponent might not be connected.`);
                return;
            }

            console.log('[Socket] Evaluated attack at', x, y, 'Result:', checkResult);
            const isHit = checkResult.hit;

            // Dummy ZK proof (real proof would come from NoirJS)
            const dummyProof = '0x' + Array(64).fill('0').join('');

            // Optimistic UI: show attack immediately as "generating"
            const newAttack = { x, y, hit: isHit, proofStatus: 'generating', txHash: null };
            setState(prev => ({
                ...prev,
                myAttacks: [...prev.myAttacks, newAttack]
            }));

            // Submit to smart contract on-chain
            const { txHash } = await attack(state.gameId, x, y, isHit, dummyProof);

            // ONLY AFTER blockchain confirmation do we broadcast the attack to the defender
            socket.emit('attack_committed', {
                gameId: state.gameId,
                x,
                y,
                hit: isHit
            });

            setState(prev => {
                const attacks = [...prev.myAttacks];
                attacks[attacks.length - 1] = {
                    ...attacks[attacks.length - 1],
                    proofStatus: 'verified',
                    txHash
                };

                const newHits = prev.myHits + (isHit ? 1 : 0);
                if (newHits >= 17) {
                    return { ...prev, myAttacks: attacks, myHits: newHits, phase: 'GAME_OVER', winner: prev.playerNumber };
                }

                // After successful attack, increment turn so this player can't attack again
                return { ...prev, myAttacks: attacks, myHits: newHits, currentTurn: prev.currentTurn + 1 };
            });
        } catch (err) {
            const msg = err?.message ?? '';
            if (msg.includes('#3') || msg.includes('NotYourTurn')) {
                alert('⏳ Not your turn yet! Wait for your opponent to attack.');
            } else {
                console.error('[App] Attack error:', err);
                alert('Attack failed. See console.');
            }
            // Revert optimistic insert on failure
            setState(prev => ({ ...prev, myAttacks: prev.myAttacks.slice(0, -1) }));
        } finally {
            isAttackingRef.current = false;
        }
    }, [attack, state.gameId, state.playerNumber]);

    const handlePlayAgain = useCallback(() => setState(INITIAL_STATE), []);

    const allMoves = [
        ...state.myAttacks.map(a => ({ ...a, by: 'you' })),
        ...state.incomingAttacks.map(a => ({ ...a, by: 'opponent' })),
    ];

    return (
        <div className="app">
            <header className="header">
                <h1 className="header__title">⚓ ZK Battleship</h1>
                <p className="header__subtitle">Trustless Naval Warfare on Stellar</p>
                <span className="header__zk-badge">
                    🔐 Powered by Zero Knowledge Proofs • Stellar Protocol 25
                </span>
            </header>

            <div className="wallet-container">
                <WalletConnect address={state.walletAddress} onConnect={handleWalletConnect} />
            </div>

            {state.phase === 'LOBBY' && (
                <GameLobby
                    walletConnected={!!state.walletAddress}
                    onCreate={handleCreateGame}
                    onJoin={handleJoinGame}
                    loading={loading}
                />
            )}

            {state.phase === 'ROOM_CODE_SPLASH' && (
                <div className="card card--accent splash-screen">
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Room Created!</h2>
                    <p className="text-muted" style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
                        Share this code with your opponent:
                    </p>
                    <div className="waiting-overlay__game-id" style={{
                        fontSize: '4rem',
                        padding: '1rem 3rem',
                        letterSpacing: '0.2em',
                        animation: 'explode 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
                    }}>
                        {state.roomId}
                    </div>
                    <p className="text-muted" style={{ marginTop: '2rem', animation: 'proofPulse 1.5s ease-in-out infinite' }}>
                        Moving to ship placement in 5s...
                    </p>
                </div>
            )}

            {state.phase === 'PLACEMENT' && (
                <ShipPlacement
                    gameId={state.gameId}
                    roomId={state.roomId}
                    playerNumber={state.playerNumber}
                    onShipsPlaced={handleShipsPlaced}
                    loading={loading}
                />
            )}

            {state.phase === 'WAITING' && (
                <div className="card card--accent waiting-overlay">
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    <p className="waiting-overlay__text">Waiting for opponent to commit ships...</p>
                    <div className="waiting-overlay__game-id">Room Code: {state.roomId || `#${state.gameId}`}</div>
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem' }}>
                        The game will start automatically when both players are ready.
                    </p>
                </div>
            )}

            {state.phase === 'PLAYING' && (
                <GamePlay
                    myShips={state.myShips}
                    myAttacks={state.myAttacks}
                    incomingAttacks={state.incomingAttacks}
                    playerNumber={state.playerNumber}
                    currentTurn={state.currentTurn}
                    loading={loading}
                    myHits={state.myHits}
                    opponentHits={state.opponentHits}
                    onAttack={handleAttack}
                    moves={allMoves}
                />
            )}

            {state.phase === 'GAME_OVER' && (
                <GameOver
                    winner={state.winner}
                    playerNumber={state.playerNumber}
                    myHits={state.myHits}
                    opponentHits={state.opponentHits}
                    moves={allMoves}
                    moveCount={state.myAttacks.length + state.incomingAttacks.length}
                    onPlayAgain={handlePlayAgain}
                />
            )}
        </div>
    );
}
