# ⚓ ZK Battleship on Stellar

> Play Battleship against anyone in the world. They literally cannot lie about hits and misses — the blockchain enforces it.

A two-player Battleship game where ship placements are committed via cryptographic hash, every hit/miss claim is backed by a **Zero Knowledge proof**, and the **Stellar Soroban** smart contract acts as a trustless referee. No server. No trust required.

**🏆 Built for the Stellar Hacks: ZK Gaming Hackathon**

---

## Architecture

```
Player Browser
│
├── React Frontend (Vite)
│   ├── Ship placement grid
│   ├── Attack grid with proof badges
│   └── ⏳ → ✓ Proof status indicators
│
├── Noir ZK Circuits (client-side WASM)
│   ├── Board Circuit: validates ship placement + Poseidon hash commitment
│   └── Shot Circuit: proves hit/miss without revealing ship positions
│
└── Stellar Soroban Contract
    ├── Board hash commitments
    ├── Attack verification with ZK proofs  
    ├── Game state management
    └── Game hub integration (start_game / end_game)
```

## How ZK Makes This Work

Without ZK, online Battleship requires trusting a server or your opponent. With ZK:

- ❌ You cannot **lie** about whether a shot hit your ship
- ❌ You cannot **rearrange ships** mid-game  
- ❌ You cannot **dispute** the outcome
- ✅ Every move is **verifiable on-chain**

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (v18+)
- [Nargo](https://noir-lang.org/docs/getting_started/installation/) (Noir compiler)
- [Stellar CLI](https://soroban.stellar.org/docs/getting-started/setup) (optional, for deployment)

### Setup

```bash
# Clone the repo  
git clone https://github.com/YOUR_USERNAME/ZK-Battleship-on-Stellar.git
cd ZK-Battleship-on-Stellar

# Run setup (installs deps, builds contracts)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start the frontend
cd frontend
npm run dev
```

Open `http://localhost:5173` in two browser tabs to play against yourself.

### Deploy to Testnet

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## Project Structure

```
├── circuits/               # Noir ZK circuits
│   ├── board/              # Board validation + commitment
│   └── shot/               # Shot hit/miss verification
├── contracts/              # Soroban smart contracts
│   └── battleship/         # Main game contract
├── frontend/               # React + Vite frontend
│   └── src/
│       ├── components/     # React components
│       └── index.css       # Design system
└── scripts/                # Build & deploy scripts
```

## Circuit Design

### Board Circuit
Proves your ship placement is valid and matches your committed hash:
- Ships within 10×10 grid bounds
- No overlapping ships
- Correct ship sizes (5, 4, 3, 3, 2)
- Poseidon(ships + salt) == committed_hash

### Shot Circuit  
Proves a shot result without revealing your board:
- Board matches previously committed hash
- Shot coordinate is within bounds
- Claimed hit/miss matches actual board state

## Smart Contract

The Soroban contract stores:
- Player board hash commitments
- Move history with proof hashes
- Game state (turns, hits, winner)

Every hit claim is backed by a proof hash on-chain. The contract enforces turn order and win conditions (17 ship cells = victory).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| ZK Circuits | Noir, Barretenberg (WASM) |
| Smart Contract | Rust, Soroban SDK |
| Blockchain | Stellar (Protocol 25) |
| Wallet | Freighter |
| Hash Function | Poseidon (ZK-friendly) |

## License

MIT
