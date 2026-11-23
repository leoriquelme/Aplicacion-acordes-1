import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite empaquetar la app más adelante para iOS y Android (Capacitor).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rolldownOptions: {
      output: {
        // Firebase y React van en archivos aparte: casi nunca cambian, así que el teléfono
        // los guarda y en cada actualización de la app solo baja lo nuevo (mucho menos).
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/ },
          ],
        },
      },
    },
  },
});
