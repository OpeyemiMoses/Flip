import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const emptyStub = path.resolve(__dirname, 'src/stubs/empty.ts');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  define: {
    'process.env': {},
  },
  resolve: {
    alias: [
      {
        find: /^react-aria\/(.*)/,
        replacement: `${path.resolve(__dirname, 'node_modules/react-aria')}/$1`,
      },
      {
        find: '@privy-io/react-auth',
        replacement: path.resolve(__dirname, 'node_modules/@privy-io/react-auth/dist/esm/index.mjs'),
      },
      {
        find: '@privy-io/wagmi',
        replacement: path.resolve(__dirname, 'node_modules/@privy-io/wagmi/dist/esm/index.mjs'),
      },
      {
        find: '@stripe/crypto',
        replacement: emptyStub,
      },
      {
        find: '@stripe/stripe-js',
        replacement: emptyStub,
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@stripe/crypto', '@stripe/stripe-js'],
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
});
