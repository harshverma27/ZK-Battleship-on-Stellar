import React from 'react';

export default function ProofBadge({ status, txHash }) {
    if (status === 'generating') {
        return (
            <span className="proof-badge proof-badge--generating">
                <span className="spinner spinner--sm"></span>
                Generating ZK Proof...
            </span>
        );
    }

    if (status === 'verified') {
        return (
            <span className="proof-badge proof-badge--verified">
                <span className="proof-badge__icon">✓</span>
                Proof Verified
                {txHash && (
                    <>
                        {' '}[
                        <a
                            className="proof-badge__tx"
                            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
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
                Proof Failed
            </span>
        );
    }

    return null;
}
