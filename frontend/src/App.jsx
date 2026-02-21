import React, { useState, useCallback, useEffect } from 'react';
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
    const { createGame, joinGame, commitBoard, attack, loading } = useGameContract();

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Socket.io sync logic
    useEffect(() => {
        socket.on('game_ready', () => {
            console.log('[Socket] Both players ready. Starting match!');
            setState(prev => {
                if (prev.phase === 'WAITING') {
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
            console.log('[App] Created game:', gameId);
            socket.emit('join_game', { gameId, playerNumber: 1 });
            updateState({ gameId, playerNumber: 1, phase: 'PLACEMENT' });
        } catch (err) {
            alert("Failed to create game. See console.");
        }
    }, [createGame, updateState]);

    const handleJoinGame = useCallback(async (gameId) => {
        try {
            await joinGame(gameId);
            console.log('[App] Joined game:', gameId);
            socket.emit('join_game', { gameId, playerNumber: 2 });
            updateState({ gameId, playerNumber: 2, phase: 'PLACEMENT' });
        } catch (err) {
            alert("Failed to join game. See console.");
        }
    }, [joinGame, updateState]);

    const handleShipsPlaced = useCallback(async (ships, boardHash, salt) => {
        try {
            await commitBoard(state.gameId, boardHash);
            console.log('[App] Board committed for game:', state.gameId);
            socket.emit('submit_ships', {
                gameId: state.gameId,
                playerNumber: state.playerNumber,
                ships
            });
            updateState({ myShips: ships, boardHash, salt, phase: 'WAITING' });
        } catch (err) {
            alert("Failed to commit board. See console.");
        }
    }, [commitBoard, state.gameId, state.playerNumber, updateState]);

    const handleAttack = useCallback(async (x, y) => {
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

            <WalletConnect address={state.walletAddress} onConnect={handleWalletConnect} />

            {state.phase === 'LOBBY' && (
                <GameLobby
                    walletConnected={!!state.walletAddress}
                    onCreate={handleCreateGame}
                    onJoin={handleJoinGame}
                    loading={loading}
                />
            )}

            {state.phase === 'PLACEMENT' && (
                <ShipPlacement
                    gameId={state.gameId}
                    playerNumber={state.playerNumber}
                    onShipsPlaced={handleShipsPlaced}
                    loading={loading}
                />
            )}

            {state.phase === 'WAITING' && (
                <div className="card card--accent waiting-overlay">
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    <p className="waiting-overlay__text">Waiting for opponent to commit ships...</p>
                    <div className="waiting-overlay__game-id">Game #{state.gameId}</div>
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
