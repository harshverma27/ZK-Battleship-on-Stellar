import React from 'react';

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx/';

export default function ProofBadge({ status, txHash }) {
    if (status === 'generating') {
        return (
            <span className="proof-badge proof-badge--generating">
                <span className="proof-badge__icon">⏳</span>
                Generating proof...
            </span>
        );
    }

    if (status === 'verified') {
        return (
            <span className="proof-badge proof-badge--verified">
                <span className="proof-badge__icon">✓</span>
                Proof verified on-chain
                {txHash && (
                    <>
                        {' '}[
                        <a
                            className="proof-badge__tx"
                            href={`${EXPLORER_BASE}${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            tx: {txHash.slice(0, 8)}...
                        </a>
                        ]
                    </>
                )}
            </span>
        );
    }

    if (status === 'failed') {
        return (
            <span className="proof-badge proof-badge--failed">
                <span className="proof-badge__icon">✗</span>
                Proof verification failed
            </span>
        );
    }

    return null;
}
