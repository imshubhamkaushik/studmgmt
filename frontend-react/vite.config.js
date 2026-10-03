import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The app is served from ONE port (13000). The browser only ever talks to
// that port: requests to /api are forwarded to the backend, which listens
// privately on 127.0.0.1:5000 and is never opened directly.
const apiProxy = {
  '/api': { target: 'http://127.0.0.1:5000' },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { 
    host: '127.0.0.1',
    port: 13000, 
    strictPort: true, 
    proxy: apiProxy 
  },
  preview: { 
    host: '127.0.0.1',
    port: 13000, 
    strictPort: true, 
    proxy: apiProxy 
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
