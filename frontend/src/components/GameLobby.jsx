import React, { useState } from 'react';

export default function GameLobby({ walletConnected, onCreate, onJoin, loading }) {
    const [joinId, setJoinId] = useState('');

    const handleCreate = () => {
        onCreate();
    };

    const handleJoin = () => {
        if (!joinId.trim()) return;
        onJoin(joinId);
    };

    return (
        <div className="lobby">
            <div className="card card--accent lobby__section">
                <h3>🚀 Create New Game</h3>
                <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>
                    Start a new game and share the Room Code with your opponent
                </p>
                <button
                    id="create-game-btn"
                    className="btn btn--primary btn--lg"
                    style={{ width: '100%' }}
                    onClick={handleCreate}
                    disabled={!walletConnected || loading}
                >
                    {loading ? (
                        <><span className="spinner" /> Processing...</>
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
                        placeholder="Enter 6-char Room Code"
                        style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        maxLength={6}
                        value={joinId}
                        onChange={(e) => setJoinId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />
                    <button
                        id="join-game-btn"
                        className="btn btn--secondary"
                        onClick={handleJoin}
                        disabled={!walletConnected || !joinId.trim() || loading}
                    >
                        {loading ? '...' : 'Join'}
                    </button>
                </div>
            </div>
        </div>
    );
}
