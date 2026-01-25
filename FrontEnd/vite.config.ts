import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Tối ưu chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Code splitting - tách vendor libraries
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI libraries
          'vendor-ui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          // Charts
          'vendor-charts': ['recharts'],
          // Utilities
          'vendor-utils': ['axios', 'dayjs', '@tanstack/react-query'],
          // Excel (heavy, load on demand)
          'vendor-excel': ['exceljs', 'xlsx'],
        },
      },
    },
  },
})
