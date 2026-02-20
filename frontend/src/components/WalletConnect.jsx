import React, { useState } from 'react';
import {
    isConnected,
    getPublicKey,
    requestAccess,
} from '@stellar/freighter-api';

export default function WalletConnect({ address, onConnect }) {
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            // isConnected() returns bool in v2.0.0
            const connected = await isConnected();

            if (!connected) {
                // Demo mode fallback — Freighter not installed
                const mockAddr = 'GDEMO' + Array.from({ length: 51 }, () =>
                    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
                ).join('');
                onConnect(mockAddr);
                return;
            }

            // Trigger Freighter popup
            await requestAccess();

            // v2.0.0: getPublicKey() returns string directly
            const pubKey = await getPublicKey();
            if (!pubKey) throw new Error('No address returned');
            onConnect(pubKey);

        } catch (err) {
            console.error('Wallet connect error:', err);
            // Demo fallback on any error
            const mockAddr = 'GDEMO' + Array.from({ length: 51 }, () =>
                'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)]
            ).join('');
            onConnect(mockAddr);
        } finally {
            setConnecting(false);
        }
    };

    if (address) {
        const isDemo = address.startsWith('GDEMO');
        return (
            <div className="wallet">
                <span className="wallet__dot" />
                <span className="wallet__address">
                    {isDemo ? '🎭 Demo ' : ''}
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
