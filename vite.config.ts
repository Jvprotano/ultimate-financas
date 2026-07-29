import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Só `lib/` tem testes: é onde vive o cálculo puro, sem React nem DOM.
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
  },
})
