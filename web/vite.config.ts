import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const isDev = process.env.NODE_ENV === 'development';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    proxy: isDev ? {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['lightweight-charts'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-popover']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['lightweight-charts'],
  },
}));