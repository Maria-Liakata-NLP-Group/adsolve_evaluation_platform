import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    base: "/",
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': 'http://localhost:8000',
      },
    },
  };
});
