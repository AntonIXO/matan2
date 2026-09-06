import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: '/s2/',
  build: { chunkSizeWarningLimit: 1300 },
});
