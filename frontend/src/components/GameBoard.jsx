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
                            (cell.type === 'ship' || cell.type === 'preview' || cell.type === 'invalid') && cell.part && `grid-cell--${cell.part}`,
                            (cell.type === 'ship' || cell.type === 'preview' || cell.type === 'invalid') && cell.orientation !== undefined && `grid-cell--${cell.orientation === 1 ? 'v' : 'h'}`,
                        ].filter(Boolean).join(' ');

                        let icon = null;
                        if (cell.type === 'hit' || cell.type === 'sunk') {
                            icon = (
                                <svg viewBox="0 0 24 24" className="icon-hit">
                                    <path fill="currentColor" d="M12,2L9,8H2L7,12L5,19L12,15L19,19L17,12L22,8H15L12,2Z" />
                                </svg>
                            );
                        } else if (cell.type === 'miss') {
                            icon = <div className="icon-miss" />;
                        }

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
