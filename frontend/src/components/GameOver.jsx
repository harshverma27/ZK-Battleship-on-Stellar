import React from 'react';
import ProofBadge from './ProofBadge';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function GameOver({
    winner, playerNumber, myHits, opponentHits, moves, moveCount, onPlayAgain,
}) {
    const isWinner = winner === playerNumber;

    return (
        <div className="game-over">
            <div>
                <h2 className={`game-over__title ${isWinner ? 'game-over__title--win' : 'game-over__title--loss'}`}>
                    {isWinner ? '🏆 Victory!' : '💀 Defeat'}
                </h2>
                <p className="text-muted mt-sm">
                    {isWinner
                        ? 'You sank all enemy ships. Every hit was cryptographically verified.'
                        : 'Your fleet has been destroyed. All moves were provably fair.'}
                </p>
            </div>

            {/* Stats */}
            <div className="game-over__stats">
                <div className="game-over__stat">
                    <div className="game-over__stat-label">Your Hits</div>
                    <div className="game-over__stat-value">{myHits}</div>
                </div>
                <div className="game-over__stat">
                    <div className="game-over__stat-label">Opponent Hits</div>
                    <div className="game-over__stat-value">{opponentHits}</div>
                </div>
                <div className="game-over__stat">
                    <div className="game-over__stat-label">Total Moves</div>
                    <div className="game-over__stat-value">{moveCount || moves.length}</div>
                </div>
                <div className="game-over__stat">
                    <div className="game-over__stat-label">Proofs Verified</div>
                    <div className="game-over__stat-value" style={{ color: 'var(--color-green)' }}>
                        ✓ {moves.filter(m => m.proofStatus === 'verified').length}
                    </div>
                </div>
            </div>

            {/* Full move history */}
            <div className="move-history card" style={{ maxWidth: '100%' }}>
                <h4 className="move-history__title">📋 Full Game Log — All Proofs Auditable</h4>
                <div className="move-history__list" style={{ maxHeight: 300 }}>
                    {moves.map((move, idx) => (
                        <div key={idx} className="move-history__item">
                            <span style={{ minWidth: 20, color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                #{idx + 1}
                            </span>
                            <span className="move-history__coord">
                                {move.by === 'you' ? '🎯' : '🛡'}{' '}
                                {COL_LABELS[move.x]}{move.y + 1}
                            </span>
                            <span className={`move-history__result ${move.hit ? 'move-history__result--hit' : 'move-history__result--miss'}`}>
                                {move.hit ? 'HIT' : 'MISS'}
                            </span>
                            <ProofBadge status={move.proofStatus} txHash={move.txHash} />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button id="play-again-btn" className="btn btn--primary btn--lg" onClick={onPlayAgain}>
                    ⚓ Play Again
                </button>
                <a
                    className="btn btn--secondary btn--lg"
                    href="https://stellar.expert/explorer/testnet"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    🔍 View on Explorer
                </a>
            </div>
        </div>
    );
}
