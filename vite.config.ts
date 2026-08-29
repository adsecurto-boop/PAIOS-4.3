import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      external: [
        'better-sqlite3',
        'bcryptjs',
        'express',
        'jsonwebtoken',
      ],
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3', 'bcryptjs', 'express', 'jsonwebtoken'],
  },
}));
