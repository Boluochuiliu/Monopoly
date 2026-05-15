import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/monopoly/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})