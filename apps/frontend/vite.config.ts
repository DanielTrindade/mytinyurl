import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Avisa se algum chunk passar de 500kb
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa React do resto do bundle
          vendor: ['react', 'react-dom'],
          // Separa componentes de UI
          ui: ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
  },
})
