import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true, // Permet l'accès depuis l'extérieur
    allowedHosts: [
      'localhost',
      '.ngrok.io',
      '.ngrok-free.app'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
