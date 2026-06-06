import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const publicUrl = env.PUBLIC_URL || '';

  return {
    plugins: [react()],
    define: {
      'process.env': {
        PUBLIC_URL: publicUrl,
        REACT_APP_API_ORIGIN: env.REACT_APP_API_ORIGIN,
        REACT_APP_API_URL: env.REACT_APP_API_URL,
        REACT_APP_SOCKET_URL: env.REACT_APP_SOCKET_URL,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.js$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
  };
});
