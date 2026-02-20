import React, { useState, useCallback } from 'react';
import WalletConnect from './components/WalletConnect';
import GameLobby from './components/GameLobby';
import ShipPlacement from './components/ShipPlacement';
import GamePlay from './components/GamePlay';
import GameOver from './components/GameOver';

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
    currentTurn: 1,
    myHits: 0,
    opponentHits: 0,
    myAttacks: [],
    incomingAttacks: [],
    winner: null,
};

export default function App() {
    const [state, setState] = useState(INITIAL_STATE);

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const handleWalletConnect = useCallback((address) => {
        updateState({ walletAddress: address });
    }, [updateState]);

    const handleCreateGame = useCallback((gameId) => {
        updateState({ gameId, playerNumber: 1, phase: 'PLACEMENT' });
    }, [updateState]);

    const handleJoinGame = useCallback((gameId) => {
        updateState({ gameId, playerNumber: 2, phase: 'PLACEMENT' });
    }, [updateState]);

    const handleShipsPlaced = useCallback((ships, boardHash, salt) => {
        updateState({ myShips: ships, boardHash, salt, phase: 'WAITING' });
        // Simulate opponent readying (in prod this polls the contract)
        setTimeout(() => updateState({ phase: 'PLAYING' }), 2500);
    }, [updateState]);

    const handleAttack = useCallback((x, y) => {
        const isHit = Math.random() > 0.6;
        const newAttack = { x, y, hit: isHit, proofStatus: 'generating', txHash: null };

        setState(prev => ({
            ...prev,
            myAttacks: [...prev.myAttacks, newAttack],
            myHits: prev.myHits + (isHit ? 1 : 0),
        }));

        // Simulate proof generation + verification
        setTimeout(() => {
            const txHash = '0x' + Math.random().toString(16).substr(2, 10);
            setState(prev => {
                const attacks = [...prev.myAttacks];
                attacks[attacks.length - 1] = { ...attacks[attacks.length - 1], proofStatus: 'verified', txHash };

                if (prev.myHits >= 17) {
                    return { ...prev, myAttacks: attacks, phase: 'GAME_OVER', winner: prev.playerNumber };
                }

                // Simulate opponent's turn
                const ox = Math.floor(Math.random() * 10);
                const oy = Math.floor(Math.random() * 10);
                const oHit = prev.myShips.some(ship => {
                    for (let j = 0; j < ship.size; j++) {
                        const cx = ship.orientation === 0 ? ship.x + j : ship.x;
                        const cy = ship.orientation === 0 ? ship.y : ship.y + j;
                        if (cx === ox && cy === oy) return true;
                    }
                    return false;
                });
                const oTx = '0x' + Math.random().toString(16).substr(2, 10);
                const incoming = [...prev.incomingAttacks, { x: ox, y: oy, hit: oHit, proofStatus: 'verified', txHash: oTx }];
                const oppHits = prev.opponentHits + (oHit ? 1 : 0);

                if (oppHits >= 17) {
                    return { ...prev, myAttacks: attacks, incomingAttacks: incoming, opponentHits: oppHits, phase: 'GAME_OVER', winner: prev.playerNumber === 1 ? 2 : 1 };
                }
                return { ...prev, myAttacks: attacks, incomingAttacks: incoming, opponentHits: oppHits };
            });
        }, 1500 + Math.random() * 1500);
    }, []);

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
                />
            )}

            {state.phase === 'PLACEMENT' && (
                <ShipPlacement
                    gameId={state.gameId}
                    playerNumber={state.playerNumber}
                    onShipsPlaced={handleShipsPlaced}
                />
            )}

            {state.phase === 'WAITING' && (
                <div className="card card--accent waiting-overlay">
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                    <p className="waiting-overlay__text">Waiting for opponent to place ships...</p>
                    <div className="waiting-overlay__game-id">Game #{state.gameId}</div>
                    <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                        Share this game ID with your opponent
                    </p>
                </div>
            )}

            {state.phase === 'PLAYING' && (
                <GamePlay
                    myShips={state.myShips}
                    myAttacks={state.myAttacks}
                    incomingAttacks={state.incomingAttacks}
                    playerNumber={state.playerNumber}
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
