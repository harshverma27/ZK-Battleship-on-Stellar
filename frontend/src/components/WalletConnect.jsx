import React, { useState } from 'react';

export default function WalletConnect({ address, onConnect }) {
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            // Try Freighter wallet
            if (window.freighterApi) {
                const { address } = await window.freighterApi.getAddress();
                onConnect(address);
            } else {
                // Demo mode: generate a mock address
                const mockAddr = 'G' + Array.from({ length: 55 }, () =>
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
                ).join('');
                onConnect(mockAddr);
            }
        } catch (err) {
            // Fallback to demo address
            const mockAddr = 'GDEMO' + Array.from({ length: 51 }, () =>
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
            ).join('');
            onConnect(mockAddr);
        } finally {
            setConnecting(false);
        }
    };

    if (address) {
        return (
            <div className="wallet">
                <span className="wallet__dot" />
                <span className="wallet__address">
                    {address.slice(0, 6)}...{address.slice(-4)}
                </span>
            </div>
        );
    }

    return (
        <div className="wallet">
            <button
                className="btn btn--primary"
                onClick={handleConnect}
                disabled={connecting}
            >
                {connecting ? (
                    <><span className="spinner" /> Connecting...</>
                ) : (
                    '🔗 Connect Wallet'
                )}
            </button>
        </div>
    );
}
