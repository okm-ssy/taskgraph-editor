import * as path from 'path';

import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_GITHUB_PAGES === 'true' ? '/taskgraph-editor/' : '/',
  plugins: [vue(), tailwindcss()],
  server: {
    port: 5353,
    proxy: {
      '/api': {
        target: 'http://localhost:9393',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
