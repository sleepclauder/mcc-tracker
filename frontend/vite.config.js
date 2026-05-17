import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://147.5.126.225',
        changeOrigin: true,
      },
    },
  },
});
