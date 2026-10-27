import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração exclusiva dos testes: não lê .env nem aponta para a API habitual.
export default defineConfig({
  envDir: false,
  plugins: [react()],
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
});
