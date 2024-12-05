import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) =>{

    return {
      plugins: [react()],
      base: mode === "development" ? "/" : "/adsolve_evaluation_platform/",
      server: {
        host: true, // Allows access from the local network
        port: 5173, // Optional: Specify a custom port
    },
  }
});
