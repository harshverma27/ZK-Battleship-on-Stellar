const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Store active games
// Map<gameId, { players: [{ id, number, ships }], attacks: [] }>
const games = new Map();

// Map<roomId, gameId>
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('create_room', ({ roomId, gameId }) => {
        rooms.set(roomId, gameId);
        console.log(`Created mapped room ${roomId} for Soroban Game ID ${gameId}`);
    });

    socket.on('lookup_room', (roomId, callback) => {
        if (rooms.has(roomId)) {
            callback({ success: true, gameId: rooms.get(roomId) });
        } else {
            console.log(`Failed lookup for room ${roomId}`);
            callback({ success: false, error: 'Room not found' });
        }
    });

    socket.on('join_game', ({ gameId, playerNumber }) => {
        socket.join(`game_${gameId}`);

        if (!games.has(gameId)) {
            games.set(gameId, { players: [], attacks: [] });
        }
        const game = games.get(gameId);

        // Remove if player already exists
        game.players = game.players.filter(p => p.number !== playerNumber);
        game.players.push({ id: socket.id, number: playerNumber, ships: null });

        console.log(`Player ${playerNumber} joined game ${gameId}`);
        io.to(`game_${gameId}`).emit('player_joined', { playerNumber });
    });

    socket.on('submit_ships', ({ gameId, playerNumber, ships }) => {
        const game = games.get(gameId);
        if (!game) return;

        const player = game.players.find(p => p.number === playerNumber);
        if (player) {
            player.ships = ships;
            console.log(`Player ${playerNumber} submitted ships for game ${gameId}`);
        }

        // Check if both players have submitted ships
        console.log(`Checking readiness for game ${gameId}: ${game.players.length} players connected.`);
        game.players.forEach(p => {
            console.log(`  - Player ${p.number}: ships placed? ${p.ships !== null}`);
        });

        const bothReady = game.players.length === 2 && game.players.every(p => p.ships !== null);
        if (bothReady) {
            console.log(`Both players ready for game ${gameId}, starting match!`);
            io.to(`game_${gameId}`).emit('game_ready');
        }
    });

    socket.on('attack_check', ({ gameId, attackerNumber, x, y }, callback) => {
        const game = games.get(gameId);
        if (!game) {
            callback({ hit: false, error: 'Game not found' });
            return;
        }

        const defenderNumber = attackerNumber === 1 ? 2 : 1;
        const defender = game.players.find(p => p.number === defenderNumber);

        if (!defender || !defender.ships) {
            console.log(`Defender or ships not found for game ${gameId}`);
            callback({ hit: false, error: 'Defender not ready' });
            return;
        }

        console.log(`Attack in game ${gameId} by Player ${attackerNumber} at ${x},${y}`);
        console.log(`Defender ships:`, JSON.stringify(defender.ships));

        // Ensure x and y are numbers
        const numX = Number(x);
        const numY = Number(y);

        // Check hit
        let isHit = false;
        for (const ship of defender.ships) {
            for (let j = 0; j < ship.size; j++) {
                const sx = ship.orientation === 0 ? ship.x + j : ship.x;
                const sy = ship.orientation === 0 ? ship.y : ship.y + j;
                if (sx === numX && sy === numY) {
                    isHit = true;
                    break;
                }
            }
            if (isHit) break;
        }

        console.log(`Attack in game ${gameId} at ${x},${y} - Hit: ${isHit} (Sending result to attacker)`);
        callback({ hit: isHit });
    });

    // New event: called by the attacker ONLY AFTER their Stellar transaction confirms
    socket.on('attack_committed', ({ gameId, x, y, hit }) => {
        console.log(`Attack committed on blockchain for game ${gameId} at ${x},${y}. Broadcasting to defender.`);
        socket.to(`game_${gameId}`).emit('incoming_attack', { x, y, hit });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sync server running on port ${PORT}`);
});
