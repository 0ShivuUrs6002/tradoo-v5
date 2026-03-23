import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network interfaces (needed for Ngrok)
    allowedHosts: ['kindhearted-zaire-overflorid.ngrok-free.dev'],
    port: 5173,
    proxy: {
      // Any request to /api from the frontend will be seamlessly forwarded
      // to the backend running on localhost:4000.
      // This solves ALL CORS and mobile connectivity issues automatically 
      // when tunneling port 5173 through ngrok.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
});
