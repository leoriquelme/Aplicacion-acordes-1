import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' permite empaquetar la app más adelante para iOS y Android (Capacitor).
export default defineConfig({
  plugins: [react()],
  base: './',
});
