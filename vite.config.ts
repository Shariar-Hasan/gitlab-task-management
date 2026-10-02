import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Plugin to copy manifest.json into dist after build
function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    writeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json');
      console.log('✓ Chrome extension files copied to dist/');
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    chromeExtensionPlugin(),
  ],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  define: {
    global: 'globalThis',
  },
});
