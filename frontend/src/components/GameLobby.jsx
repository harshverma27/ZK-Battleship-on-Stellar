import React, { useState } from 'react';

export default function GameLobby({ walletConnected, onCreate, onJoin }) {
    const [joinId, setJoinId] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = () => {
        setCreating(true);
        // Simulate contract call — in prod this calls create_game()
        setTimeout(() => {
            const gameId = Math.floor(Math.random() * 9000) + 1000;
            onCreate(gameId);
            setCreating(false);
        }, 800);
    };

    const handleJoin = () => {
        if (!joinId.trim()) return;
        onJoin(parseInt(joinId, 10));
    };

    return (
        <div className="lobby">
            <div className="card card--accent lobby__section">
                <h3>🚀 Create New Game</h3>
                <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>
                    Start a new game and share the ID with your opponent
                </p>
                <button
                    id="create-game-btn"
                    className="btn btn--primary btn--lg"
                    style={{ width: '100%' }}
                    onClick={handleCreate}
                    disabled={!walletConnected || creating}
                >
                    {creating ? (
                        <><span className="spinner" /> Creating Game...</>
                    ) : (
                        '⚓ Create Game'
                    )}
                </button>
                {!walletConnected && (
                    <p className="text-muted mt-sm" style={{ fontSize: '0.75rem' }}>
                        Connect your wallet first
                    </p>
                )}
            </div>

            <div className="lobby__divider">or</div>

            <div className="card lobby__section">
                <h3>🎯 Join Existing Game</h3>
                <div className="lobby__row">
                    <input
                        id="game-id-input"
                        className="input"
                        type="text"
                        placeholder="Enter Game ID"
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                    <button
                        id="join-game-btn"
                        className="btn btn--secondary"
                        onClick={handleJoin}
                        disabled={!walletConnected || !joinId.trim()}
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
}
