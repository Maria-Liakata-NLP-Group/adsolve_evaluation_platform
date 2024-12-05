import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() =>{

    return {
      plugins: [react()],
      base: "/", // Base for production
      server: {
        host: true, // Allows access from the local network
        port: 5173, // Optional: Specify a custom port
      },
    };
});
