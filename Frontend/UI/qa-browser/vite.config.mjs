import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { coberturaVite } from './cobertura.mjs';

// Configuração exclusiva dos testes: não lê .env nem aponta para a API habitual.
export default defineConfig({
  envDir: false,
  plugins: [coberturaVite(),react()],
  define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
});
