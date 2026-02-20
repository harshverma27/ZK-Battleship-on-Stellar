import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom Vite plugin to fix the Soroban TS bindings interop issue
const stellarInteropPlugin = () => ({
  name: 'stellar-interop',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('contracts/battleship/dist/index.js')) {
      // Replace wildcard export with named exports that we actually use/need
      return code.replace(
        /export \* from "@stellar\/stellar-sdk";/,
        "export { Address, Contract, xdr } from '@stellar/stellar-sdk';"
      );
    }
    return null;
  }
});

export default defineConfig({
  plugins: [react(), stellarInteropPlugin()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
  }
});
