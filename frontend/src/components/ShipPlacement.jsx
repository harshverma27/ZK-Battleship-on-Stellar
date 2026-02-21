import React, { useState, useCallback, useMemo } from 'react';
import GameBoard from './GameBoard';

const SHIPS = [
    { name: 'Carrier', size: 5 },
    { name: 'Battleship', size: 4 },
    { name: 'Cruiser', size: 3 },
    { name: 'Submarine', size: 3 },
    { name: 'Destroyer', size: 2 },
];

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

function isValidPlacement(ship, placedShips, excludeIdx = -1) {
    const cells = getShipCells(ship);
    // Check bounds
    for (const c of cells) {
        if (c.x < 0 || c.x >= 10 || c.y < 0 || c.y >= 10) return false;
    }
    // Check overlaps
    for (let i = 0; i < placedShips.length; i++) {
        if (i === excludeIdx) continue;
        const existing = getShipCells(placedShips[i]);
        for (const c of cells) {
            for (const e of existing) {
                if (c.x === e.x && c.y === e.y) return false;
            }
        }
    }
    return true;
}

export default function ShipPlacement({ gameId, playerNumber, onShipsPlaced, loading }) {
    const [copied, setCopied] = useState(false);

    const handleCopyId = () => {
        navigator.clipboard.writeText(String(gameId)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    const [placedShips, setPlacedShips] = useState([]);
    const [activeShipIdx, setActiveShipIdx] = useState(0);
    const [orientation, setOrientation] = useState(0); // 0=horizontal, 1=vertical
    const [hoverPos, setHoverPos] = useState(null);

    const currentShip = SHIPS[activeShipIdx] || null;

    const handleCellClick = useCallback((x, y) => {
        if (!currentShip) return;
        const ship = { ...currentShip, x, y, orientation };
        if (!isValidPlacement(ship, placedShips)) return;

        const newPlaced = [...placedShips, ship];
        setPlacedShips(newPlaced);
        setActiveShipIdx(prev => prev + 1);
        setHoverPos(null);
    }, [currentShip, orientation, placedShips]);

    const handleHover = useCallback((x, y) => {
        setHoverPos({ x, y });
    }, []);

    const handleLeave = useCallback(() => {
        setHoverPos(null);
    }, []);

    const handleRotate = () => {
        setOrientation(prev => prev === 0 ? 1 : 0);
    };

    const handleReset = () => {
        setPlacedShips([]);
        setActiveShipIdx(0);
        setOrientation(0);
        setHoverPos(null);
    };

    const handleRandomPlacement = () => {
        let currentPlacements = [];

        for (const shipDef of SHIPS) {
            let placed = false;
            let attempts = 0;
            // Try random spots until we find a valid one (usually takes just a few tries)
            while (!placed && attempts < 1000) {
                const randX = Math.floor(Math.random() * 10);
                const randY = Math.floor(Math.random() * 10);
                const randOri = Math.random() > 0.5 ? 1 : 0;

                const testShip = { ...shipDef, x: randX, y: randY, orientation: randOri };

                if (isValidPlacement(testShip, currentPlacements)) {
                    currentPlacements.push(testShip);
                    placed = true;
                }
                attempts++;
            }

            // If we somehow failed after 1000 attempts, clear and start over (very rare)
            if (!placed) {
                currentPlacements = [];
                break;
            }
        }

        // Only update state if all 5 ships successfully placed
        if (currentPlacements.length === SHIPS.length) {
            setPlacedShips(currentPlacements);
            setActiveShipIdx(SHIPS.length); // Disable manual placement
            setHoverPos(null);
        } else {
            // Recursive retry on the rare chance of getting completely boxed in
            handleRandomPlacement();
        }
    };

    const handleCommit = async () => {
        // Generate board hash (placeholder for real Poseidon via NoirJS)
        // Using pure-JS hash so it works on HTTP/non-localhost devices too
        const salt = Math.floor(Math.random() * 1e15);
        const boardData = placedShips.map(s => `${s.x},${s.y},${s.orientation}`).join('|');
        const raw = boardData + salt;

        // Simple djb2 hash — works everywhere, no crypto.subtle needed
        let h = 5381;
        for (let i = 0; i < raw.length; i++) {
            h = ((h << 5) + h) ^ raw.charCodeAt(i);
            h = h >>> 0; // keep 32-bit unsigned
        }
        // Expand to 32 bytes by seeding multiple rounds
        const parts = [];
        for (let i = 0; i < 8; i++) {
            h = ((h << 5) + h) ^ (i * 2654435761);
            h = h >>> 0;
            parts.push(h.toString(16).padStart(8, '0'));
        }
        const boardHash = '0x' + parts.join('');

        onShipsPlaced(placedShips, boardHash, salt);
    };

    const allPlaced = placedShips.length === SHIPS.length;

    // Build grid cells
    const cells = useMemo(() => {
        const grid = Array.from({ length: 10 }, () =>
            Array.from({ length: 10 }, () => ({ type: 'water' }))
        );

        // Placed ships
        for (const ship of placedShips) {
            for (const c of getShipCells(ship)) {
                grid[c.y][c.x] = { type: 'ship' };
            }
        }

        // Preview
        if (hoverPos && currentShip) {
            const preview = { ...currentShip, x: hoverPos.x, y: hoverPos.y, orientation };
            const valid = isValidPlacement(preview, placedShips);
            const previewCells = getShipCells(preview);
            for (const c of previewCells) {
                if (c.x >= 0 && c.x < 10 && c.y >= 0 && c.y < 10) {
                    if (grid[c.y][c.x].type === 'water') {
                        grid[c.y][c.x] = { type: valid ? 'preview' : 'invalid' };
                    }
                }
            }
        }

        return grid;
    }, [placedShips, hoverPos, currentShip, orientation]);

    return (
        <div className="placement">
            {/* Game ID banner — so Player 1 can share with Player 2 */}
            {gameId && (
                <div className="card card--accent" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 'var(--spacing-md)', padding: 'var(--spacing-md) var(--spacing-xl)',
                    width: '100%', maxWidth: 600, flexWrap: 'wrap'
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {playerNumber === 1 ? '📤 Share this Game ID with your opponent:' : '🎮 Game ID:'}
                    </span>
                    <span className="waiting-overlay__game-id" style={{ padding: '8px 20px', fontSize: '1.2rem' }}>
                        {gameId}
                    </span>
                    <button className="btn btn--secondary btn--sm" onClick={handleCopyId}>
                        {copied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                </div>
            )}

            {/* Ship tokens */}
            <div className="placement__ships">
                {SHIPS.map((ship, idx) => (
                    <div
                        key={ship.name}
                        className={`ship-token ${idx === activeShipIdx ? 'ship-token--active' : ''} ${idx < placedShips.length ? 'ship-token--placed' : ''}`}
                        onClick={() => idx >= placedShips.length && setActiveShipIdx(idx)}
                    >
                        <span>{ship.name}</span>
                        <div className="ship-token__cells">
                            {Array.from({ length: ship.size }, (_, i) => (
                                <div key={i} className="ship-token__cell" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div className="placement__controls">
                <button className="btn btn--secondary btn--sm" onClick={handleRotate} disabled={allPlaced}>
                    🔄 Rotate ({orientation === 0 ? 'H' : 'V'})
                </button>
                <button className="btn btn--secondary btn--sm" onClick={handleReset}>
                    ↩ Reset
                </button>
                <button className="btn btn--secondary btn--sm" onClick={handleRandomPlacement} disabled={allPlaced}>
                    🎲 Randomize
                </button>
                {allPlaced && (
                    <button
                        id="lock-in-btn"
                        className="btn btn--primary"
                        onClick={handleCommit}
                        disabled={loading}
                    >
                        {loading ? (
                            <><span className="spinner" /> Committing...</>
                        ) : (
                            '🔒 Lock In Ships'
                        )}
                    </button>
                )}
            </div>

            {!allPlaced && (
                <p className="placement__hint">
                    Place your <strong>{currentShip?.name}</strong> ({currentShip?.size} cells) — Click a cell to place
                </p>
            )}

            {/* Grid */}
            <div className="card">
                <GameBoard
                    cells={cells}
                    clickable={!allPlaced}
                    onClick={handleCellClick}
                    onHover={handleHover}
                    onLeave={handleLeave}
                />
            </div>
        </div>
    );
}
