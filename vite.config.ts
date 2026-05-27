import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Only expose env vars prefixed with VITE_ to the frontend bundle.
  // This prevents Vite (and railpack) from trying to resolve server-side
  // secrets like ANTHROPIC_AUTH_TOKEN during the build phase.
  envPrefix: 'VITE_',
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // 允许通过隧道/公网域名访问
    allowedHosts: true,
  },
})
