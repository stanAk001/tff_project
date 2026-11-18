import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const api = env.VITE_API_PROXY || 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // In development the API is reached through this proxy, so cookies stay same-origin
      proxy: {
        '/api': api,
        '/uploads': api,
        '/sitemap.xml': api,
        '/robots.txt': api,
      },
    },
  };
});
