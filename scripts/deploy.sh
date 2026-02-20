#!/bin/bash
# ZK Battleship on Stellar — Deploy Script
# Deploys Soroban contract to Stellar Testnet

set -e

echo "🚀 Deploying ZK Battleship to Stellar Testnet"
echo "=============================================="

# Check stellar CLI
command -v stellar >/dev/null 2>&1 || { echo "❌ Stellar CLI not found. Install: cargo install stellar-cli"; exit 1; }

# Build contract
echo "🔨 Building contract..."
cd contracts/battleship
cargo build --target wasm32-unknown-unknown --release
cd ../..

WASM_PATH="target/wasm32-unknown-unknown/release/zk_battleship.wasm"

# Check if WASM file exists
if [ ! -f "$WASM_PATH" ]; then
  echo "❌ WASM file not found at $WASM_PATH"
  exit 1
fi

# Generate keypair if not exists
echo "🔑 Setting up account..."
stellar keys generate deployer --network testnet 2>/dev/null || true
DEPLOYER_ADDR=$(stellar keys address deployer)
echo "   Deployer: $DEPLOYER_ADDR"

# Fund account
echo "💰 Funding account..."
stellar keys fund deployer --network testnet 2>/dev/null || true

# Deploy contract
echo "📤 Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source deployer \
  --network testnet)

echo ""
echo "✅ Contract deployed!"
echo "   Contract ID: $CONTRACT_ID"
echo ""

# Write contract ID to frontend .env
echo "VITE_CONTRACT_ID=$CONTRACT_ID" > frontend/.env
echo "VITE_NETWORK=testnet" >> frontend/.env
echo "VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015" >> frontend/.env

echo "📝 Contract ID written to frontend/.env"
echo ""
echo "   Start the frontend: cd frontend && npm run dev"
