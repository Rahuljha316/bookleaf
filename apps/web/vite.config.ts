import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
      '@bookleaf/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
},
server: {
  port: 5173,
    proxy: {
    '/api': {
      target: 'http://localhost:5000',
        changeOrigin: true,
      },
  },
},
});
