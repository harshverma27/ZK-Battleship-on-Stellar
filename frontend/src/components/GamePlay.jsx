import React, { useMemo } from 'react';
import GameBoard from './GameBoard';
import ProofBadge from './ProofBadge';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function getShipCells(ship) {
    const cells = [];
    for (let j = 0; j < ship.size; j++) {
        cells.push({
            x: ship.orientation === 0 ? ship.x + j : ship.x,
            y: ship.orientation === 0 ? ship.y : ship.y + j,
        });
    }
    return cells;
}

export default function GamePlay({
    myShips, myAttacks, incomingAttacks,
    playerNumber, currentTurn, loading, myHits, opponentHits,
    onAttack, moves,
}) {
    // Turn logic: Odd turns = Player 1, Even turns = Player 2
    const isMyTurn = (playerNumber === 1 && currentTurn % 2 !== 0) ||
        (playerNumber === 2 && currentTurn % 2 === 0);

    const isWaiting = loading || myAttacks.some(a => a.proofStatus === 'generating');

    // Build "my board" grid (shows my ships + incoming attacks)
    const myBoard = useMemo(() => {
        const grid = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => ({ type: 'water' }))
        );
        for (const ship of myShips) {
            for (const c of getShipCells(ship)) {
                if (c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10) {
                    grid[c.y][c.x] = { type: 'ship' };
                }
            }
        }
        for (const atk of incomingAttacks) {
            if (atk.x >= 0 && atk.x < 10 && atk.y >= 0 && atk.y < 10) {
                grid[atk.y][atk.x] = { type: atk.hit ? 'hit' : 'miss' };
            }
        }
        return grid;
    }, [myShips, incomingAttacks]);

    // Build "opponent's board" grid (shows my attacks)
    const opponentBoard = useMemo(() => {
        const grid = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => ({ type: 'water' }))
        );
        for (const atk of myAttacks) {
            if (atk.x >= 0 && atk.x < 10 && atk.y >= 0 && atk.y < 10) {
                grid[atk.y][atk.x] = { type: atk.hit ? 'hit' : 'miss' };
            }
        }
        return grid;
    }, [myAttacks]);

    const handleAttackClick = (x, y) => {
        if (!isMyTurn || isWaiting) return;
        if (myAttacks.some(a => a.x === x && a.y === y)) return;
        onAttack(x, y);
    };

    const recentMoves = [...moves].reverse().slice(0, 10);

    return (
        <div className="gameplay">
            {/* Turn indicator */}
            <div className="gameplay__status">
                <div className={`gameplay__turn ${isMyTurn && !isWaiting ? 'gameplay__turn--yours' : 'gameplay__turn--theirs'}`}>
                    {isWaiting
                        ? '⏳ Submitting move on-chain...'
                        : isMyTurn
                            ? '🎯 Your Turn — Click a cell on Enemy Waters to attack'
                            : '⏳ Waiting for opponent to attack...'}
                </div>
            </div>

            {/* Score bar */}
            <div className="score-bar">
                <div className="score-bar__player">
                    <span className="score-bar__name">You</span>
                    <span className="score-bar__hits">{myHits}</span>
                </div>
                <div className="score-bar__divider">—</div>
                <div className="score-bar__player">
                    <span className="score-bar__name">Opponent</span>
                    <span className="score-bar__hits">{opponentHits}</span>
                </div>
                <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: 8 }}>/ 17 to win</span>
            </div>

            {/* Grids */}
            <div className="grid-container">
                <div className="grid-panel">
                    <h3 className="grid-panel__title grid-panel__title--yours">🛡 Your Fleet</h3>
                    <GameBoard cells={myBoard} clickable={false} />
                </div>

                <div className="grid-panel">
                    <h3 className="grid-panel__title grid-panel__title--enemy">🎯 Enemy Waters</h3>
                    <GameBoard
                        cells={opponentBoard}
                        clickable={isMyTurn && !isWaiting}
                        onClick={handleAttackClick}
                    />
                </div>
            </div>

            {/* Recent moves with proof badges */}
            {recentMoves.length > 0 && (
                <div className="move-history card">
                    <h4 className="move-history__title">📋 Move Log</h4>
                    <div className="move-history__list">
                        {recentMoves.map((move, idx) => (
                            <div key={idx} className="move-history__item">
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
            )}
        </div>
    );
}
