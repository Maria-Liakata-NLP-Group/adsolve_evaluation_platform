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
        '/api': 'http://127.0.0.1:8005',
      },
    },
  };
});
