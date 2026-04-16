import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Android WebView için chunk boyutunu yönet
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Vendor bundle'ı küçük parçalara böl — Android JS parse süresini azaltır
          manualChunks(id) {
            // React ekosistemi TAMAMEN bir arada — react-dom ve scheduler
            // arasındaki circular dep nedeniyle asla ayrılmamalı
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/')
            ) {
              return 'react-vendor';
            }
            // Capacitor plugins (~40KB)
            if (id.includes('node_modules/@capacitor')) {
              return 'capacitor';
            }
            // Axios + HTTP utils (~15KB)
            if (id.includes('node_modules/axios')) {
              return 'http';
            }
          }
        }
      }
    }
  };
});
