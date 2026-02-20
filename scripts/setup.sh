#!/bin/bash
# ZK Battleship on Stellar — Setup Script
# Installs dependencies and builds all components

set -e

echo "🔧 ZK Battleship Setup"
echo "======================"

# 1. Check prerequisites
echo "📋 Checking prerequisites..."
command -v rustc >/dev/null 2>&1 || { echo "❌ Rust not found. Install: https://rustup.rs/"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install: https://nodejs.org/"; exit 1; }
echo "✓ Rust $(rustc --version | cut -d' ' -f2)"
echo "✓ Node $(node --version)"

# 2. Install Soroban WASM target
echo ""
echo "📦 Installing WASM target..."
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# 3. Build Soroban contract
echo ""
echo "🔨 Building Soroban contract..."
cd contracts/battleship
cargo build --target wasm32-unknown-unknown --release
echo "✓ Contract built"

# 4. Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../../frontend
npm install
echo "✓ Frontend dependencies installed"

echo ""
echo "✅ Setup complete!"
echo "   Run 'npm run dev' in the frontend/ directory to start the dev server."
