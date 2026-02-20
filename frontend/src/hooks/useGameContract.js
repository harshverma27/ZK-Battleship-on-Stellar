import { useState, useCallback } from 'react';
import {
    getPublicKey,
    signTransaction,
    isConnected,
} from '@stellar/freighter-api';
import { Client, networks } from '../contracts/battleship/dist/index.js';

const NETWORK = networks.testnet;

async function getClient() {
    const publicKey = await getPublicKey(); // v2.0.0 uses getPublicKey()
    if (!publicKey) throw new Error('Wallet not connected');

    return new Client({
        contractId: NETWORK.contractId,
        networkPassphrase: NETWORK.networkPassphrase,
        rpcUrl: 'https://soroban-testnet.stellar.org',
        publicKey,
        signTransaction: async (xdr) => {
            // Freighter v2 returns a plain string
            // stellar-sdk v12 Client expects { signedTxXdr: string }
            const signedTxXdr = await signTransaction(xdr, {
                networkPassphrase: NETWORK.networkPassphrase,
            });
            return { signedTxXdr };
        },
    });
}

export function useGameContract() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async (action) => {
        setLoading(true);
        setError(null);
        try {
            const client = await getClient();
            return await action(client);
        } catch (err) {
            const msg = err?.message ?? String(err);
            console.error('[useGameContract]', err);
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createGame = useCallback(async () => {
        return run(async (client) => {
            const publicKey = await getPublicKey();
            const tx = await client.create_game({ player1: publicKey });
            const sent = await tx.signAndSend();
            console.log('[createGame] full result:', sent);
            console.log('[createGame] result.result:', sent?.result);
            // Soroban SDK v12: result is in sent.result
            const gameId = sent?.result;
            console.log('[createGame] game_id:', gameId);
            return gameId;
        });
    }, []);

    const joinGame = useCallback(async (gameId) => {
        return run(async (client) => {
            const publicKey = await getPublicKey();
            const tx = await client.join_game({ game_id: gameId, player2: publicKey });
            await tx.signAndSend();
        });
    }, []);

    const commitBoard = useCallback(async (gameId, boardHashHex) => {
        return run(async (client) => {
            const publicKey = await getPublicKey();
            const hashBytes = Buffer.from(boardHashHex.replace('0x', ''), 'hex');
            const tx = await client.commit_board({
                game_id: gameId,
                player: publicKey,
                board_hash: hashBytes,
            });
            await tx.signAndSend();
        });
    }, []);

    const attack = useCallback(async (gameId, x, y, isHit, proofHashHex) => {
        return run(async (client) => {
            const publicKey = await getPublicKey();
            const proofBytes = Buffer.from(proofHashHex.replace('0x', ''), 'hex');
            const tx = await client.attack({
                game_id: gameId,
                attacker: publicKey,
                x,
                y,
                hit: isHit,
                proof_hash: proofBytes,
            });
            const result = await tx.signAndSend();
            return { hit: result.result, txHash: result.hash };
        });
    }, []);

    const getGameState = useCallback(async (gameId) => {
        try {
            // Need publicKey even for read-only simulate (SDK needs a source account to build the tx)
            const publicKey = await getPublicKey();
            const client = new Client({
                contractId: NETWORK.contractId,
                networkPassphrase: NETWORK.networkPassphrase,
                rpcUrl: 'https://soroban-testnet.stellar.org',
                publicKey,
            });
            const tx = await client.get_game({ game_id: gameId });
            // simulate() returns `this` — access .result on the tx object itself
            await tx.simulate();
            const gameState = tx.result;
            if (!gameState) return null;

            // Normalize: Soroban SDK enums come as {tag:'Active'}, normalize to string
            const rawStatus = gameState.status;
            const statusStr = typeof rawStatus === 'string'
                ? rawStatus
                : (rawStatus?.tag ?? String(rawStatus));

            console.log('[getGameState] game_id:', gameId, 'status:', statusStr);
            return { ...gameState, status: statusStr };
        } catch (err) {
            console.error('[getGameState]', err);
            return null;
        }
    }, []);

    return { loading, error, createGame, joinGame, commitBoard, attack, getGameState };
}
