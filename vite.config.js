// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: {
        fs: true,
        path: true,
        vm: true,
        crypto: true,
        stream: true,
        events: true,
      },
    }),
  ],
  resolve: {
    alias: {
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      url: 'url',
      buffer: 'buffer',
      process: 'process/browser',
      events: 'events',
      fs: 'vite-plugin-node-polyfills/shims/fs',
      vm: 'vite-plugin-node-polyfills/shims/vm',
      path: 'path-browserify',
    },
  },
  define: {
    global: 'window',
    'process.env': {},
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'html5-qrcode': ['html5-qrcode'],
          qrcode: ['qrcode'],
        },
      },
    },
    minify: 'terser', // Use Terser with custom options
    terserOptions: {
      keep_fnames: true, // Keeps function names
      mangle: {
        reserved: [], // Removed dashcore-related names
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  optimizeDeps: {
    include: [
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'assert',
      'url',
      'process',
      'events',
      'path-browserify',
      'html5-qrcode',
      'qrcode',
      'bn.js',
      'elliptic',
    ],
  },
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' https://insight.dashtest.net",
    },
  },
});