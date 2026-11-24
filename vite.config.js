import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/accounts-api': { target: 'http://127.0.0.1:8080', changeOrigin: true, rewrite: path => path.replace(/^\/accounts-api/, '/accounts') },
      '/cards-api': { target: 'http://127.0.0.1:8080', changeOrigin: true, rewrite: path => path.replace(/^\/cards-api/, '/cards') },
      '/loans-api': { target: 'http://127.0.0.1:8080', changeOrigin: true, rewrite: path => path.replace(/^\/loans-api/, '/loans') },
      '/gateway': { target: 'http://127.0.0.1:8080', changeOrigin: true, rewrite: path => path.replace(/^\/gateway/, '/gateway') }
    }
  }
})
