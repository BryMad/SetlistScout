import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Explicitly set the base URL
  server: {
    proxy: {
      '/admin': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
      '/playlist': 'http://localhost:3000',
      '/setlist': 'http://localhost:3000',
      '/sse': 'http://localhost:3000',
    }
  }
})