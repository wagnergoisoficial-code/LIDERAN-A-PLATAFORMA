import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Em produção o endereço da API tem de vir de VITE_API_URL (ex.: https://api.exemplo.com/api)
  if (mode === 'production' && !env.VITE_API_URL) {
    console.warn('\n⚠️  VITE_API_URL não definida: o site vai chamar /api no próprio domínio.\n');
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
