import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Electron loads the production app from a file:// URL. Relative asset paths
  // are required there; absolute /assets paths leave a packaged window blank.
  base: './',
  plugins: [react()],
})
