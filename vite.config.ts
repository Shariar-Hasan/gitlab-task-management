import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

// Plugin to copy manifest.json and icons into dist after build
function chromeExtensionPlugin() {
  return {
    name: 'chrome-extension',
    writeBundle() {
      // Copy manifest
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
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
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
