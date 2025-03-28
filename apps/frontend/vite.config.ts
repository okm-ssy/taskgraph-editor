import { defineConfig } from 'vite'
import * as path from 'path';
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias:
    {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
