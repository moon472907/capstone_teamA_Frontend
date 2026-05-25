import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // sockjs-client references the Node global `global`
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.everyknu.cloud',
        changeOrigin: true,
        secure: true,
        headers: {
          origin: 'https://www.everyknu.cloud',
        },
      },
      '/ws': {
        target: 'https://api.everyknu.cloud',
        changeOrigin: true,
        secure: true,
        ws: true,
        headers: {
          origin: 'https://www.everyknu.cloud',
        },
      },
    },
  },
})
