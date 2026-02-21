# ⚓ ZK Battleship on Stellar

> **Play Battleship against anyone in the world. They literally cannot lie about hits and misses — the blockchain and cryptography enforce it.**

A fully trustless, two-player Battleship game where ship placements are committed via cryptographic hashes, every hit/miss claim is mathematically backed by a **Zero Knowledge proof**, and the **Stellar Soroban** smart contract acts as an incorruptible referee. 

No trusting a central game server. No trusting your opponent. 

---

## 🏆 Built for the Stellar Hacks: ZK Gaming Hackathon

This project demonstrates the power of combining Stellar's fast, low-cost smart contracts (Soroban) with client-side Zero Knowledge cryptography (Noir) to build a game that would traditionally require a trusted centralized authority.

---

## 🏗 Architecture

```text
Player Browser (React + Vite)
│
├── 🎮 Game UI
│   ├── Interactive Ship placement grid
│   ├── Dual attack grids with cohesive CSS ship rendering
│   └── ⏳ → ✓ Real-time Proof Status Badges
│
├── 🔐 Noir ZK Circuits (Client-side WASM)
│   ├── Board Circuit: Validates grid boundaries & calculates Poseidon hash commitment
│   └── Shot Circuit: Proves hit/miss mathematically without revealing ship coordinates
│
└── ⛓️ Stellar Soroban Smart Contract (Testnet)
    ├── Stores player board hash commitments
    ├── Verifies attack ZK proofs natively on-chain
    ├── Manages turns, hit tracking, and win conditions
    └── Enforces game rules completely trustlessly
```

---

## 🔑 Prerequisites & Wallet Setup

To play or develop ZK Battleship, you **must** have the Freighter browser extension installed and configured for the Stellar Testnet.

1. **Install Freighter:** Download the [Freighter Wallet Extension](https://www.freighter.app/) for your browser.
2. **Create an Account:** Follow the setup wizard to create a new wallet.
3. **Switch to Testnet:** 
   * Open the Freighter extension.
   * Click the gear icon (Settings) ⚙️
   * Select **Network** and switch it to **Testnet**.
4. **Fund your Account:**
   * Go to the [Stellar Testnet Faucet](https://laboratory.stellar.org/#account-creator?network=test).
   * Paste your Freighter public key and fund it with friendbot to receive test XLM.

---

## 🛠 Development Setup

If you want to build the smart contracts, compile the ZK circuits, and run everything from scratch, follow these steps.

### 1. System Requirements
- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (v18+)
- [Nargo](https://noir-lang.org/docs/getting_started/installation/) (Noir compiler, tested with `v1.0.0-beta.18`+)
- [Stellar CLI](https://soroban.stellar.org/docs/getting-started/setup)

### 2. Scaffold and Build
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/ZK-Battleship-on-Stellar.git
cd ZK-Battleship-on-Stellar

# Make scripts executable
chmod +x scripts/setup.sh scripts/deploy.sh

# Install dependencies and build Soroban contracts
./scripts/setup.sh
```

### 3. Deploy Contract to Testnet
You need to deploy the Soroban contract to the Stellar Testnet so the frontend can interact with it.

```bash
# Deploys the contract and automatically configures frontend/.env with the new contract IDs
./scripts/deploy.sh
```

---

## 🚀 Running the Game Locally

Once deployment is complete (or if you are just running the frontend against an already deployed contract), you need to start both the WebSocket Sync Server and the React Frontend.

### Terminal 1: WebSocket Sync Server
We use a lightweight, off-chain WebSocket server simply to propagate events (like "player joined" or "attack pending") between browsers in real-time. **Crucially, this server has no authority over the game logic—it only relays messages. The Soroban contract is the ultimate source of truth.**

```bash
cd backend
npm install
node server.js
```
*The server will start on `http://localhost:3001`.*

### Terminal 2: React Frontend
Start the Vite development server.

```bash
cd frontend
npm install
npm run dev
```
*The React app will start on `http://localhost:5173`.*

---

## 🎮 How to Play (Testing with Two Players)

To simulate a real game, you need two separate browsers (or one normal window and one Incognito/Private window), **each with an independent Freighter wallet account** funded on the Testnet.

1. **Player 1:** 
   * Open `http://localhost:5173`.
   * Connect Freighter Wallet.
   * Click **Create Game**.
   * Copy the generated `Game ID`.
2. **Player 2:**
   * Open `http://localhost:5173` in a different browser/profile.
   * Connect a *different* Freighter Wallet account.
   * Enter the `Game ID` provided by Player 1 and click **Join Game**.
3. **Placement:**
   * Both players drag and drop their ships, or use the **🎲 Randomize** button.
   * Click **🔒 Lock In Ships**. This calculates a Poseidon Hash commitment of your board and submits it to the Stellar testnet.
4. **Battle!**
   * Take turns attacking coordinates on the Enemy Waters grid.
   * Watch the real-time proof badges verify the cryptographically secure hits and misses!

---

## 🧠 How ZK Makes This Trustless

Without Zero Knowledge proofs, online Battleship requires trusting a centralized server to hold the board states and report hits honestly. With ZK Battleship:

- ❌ You **cannot lie** about whether a shot hit your ship. The ZK circuit proves the mathematical relationship between the shot coordinate, your hidden ship array, and your public board hash.
- ❌ You **cannot rearrange ships** mid-game. Your board hash is permanently committed to the Soroban contract at the start of the game.
- ❌ You **cannot dispute** the outcome. Every verified hit increments an on-chain counter. Once a player reaches 17 hits, the contract declares them the winner.
- ✅ Every move is **fully verifiable on-chain**.

## License
MIT
