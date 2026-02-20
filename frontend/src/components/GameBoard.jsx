import React from 'react';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Reusable 10x10 game grid with column/row labels.
 * 
 * Props:
 *   cells      - 10x10 array of cell state objects: { type: 'water'|'ship'|'hit'|'miss'|'preview'|'invalid' }
 *   clickable  - whether cells are clickable
 *   onClick    - (x, y) => void
 *   onHover    - (x, y) => void  (optional)
 *   onLeave    - () => void (optional)
 */
export default function GameBoard({ cells, clickable = false, onClick, onHover, onLeave }) {
    return (
        <div className="game-grid">
            {/* Top-left corner */}
            <div className="grid-label" />

            {/* Column labels */}
            {COL_LABELS.map((label, i) => (
                <div key={`col-${i}`} className="grid-label">{label}</div>
            ))}

            {/* Rows */}
            {Array.from({ length: 10 }, (_, row) => (
                <React.Fragment key={`row-${row}`}>
                    {/* Row label */}
                    <div className="grid-label">{row + 1}</div>

                    {/* Cells */}
                    {Array.from({ length: 10 }, (_, col) => {
                        const cell = cells[row]?.[col] || { type: 'water' };
                        const classNames = [
                            'grid-cell',
                            clickable && 'grid-cell--clickable',
                            cell.type === 'ship' && 'grid-cell--ship',
                            cell.type === 'hit' && 'grid-cell--hit',
                            cell.type === 'miss' && 'grid-cell--miss',
                            cell.type === 'sunk' && 'grid-cell--sunk',
                            cell.type === 'preview' && 'grid-cell--preview',
                            cell.type === 'invalid' && 'grid-cell--invalid',
                            cell.type === 'placing' && 'grid-cell--placing',
                        ].filter(Boolean).join(' ');

                        let icon = '';
                        if (cell.type === 'hit' || cell.type === 'sunk') icon = '🔥';
                        else if (cell.type === 'miss') icon = '•';
                        else if (cell.type === 'ship') icon = '▪';

                        return (
                            <div
                                key={`cell-${row}-${col}`}
                                className={classNames}
                                onClick={() => clickable && onClick?.(col, row)}
                                onMouseEnter={() => onHover?.(col, row)}
                                onMouseLeave={() => onLeave?.()}
                            >
                                {icon}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
}
