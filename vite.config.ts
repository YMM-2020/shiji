import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
    // 允许通过隧道/公网域名访问
    allowedHosts: true,
  },
})
