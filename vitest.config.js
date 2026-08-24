import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Separate from vite.config.js so the production build stays untouched.
// The '@' alias mirrors the app alias; environment is plain node because the
// engine is framework-free.

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})