import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'public/icons',
          dest: '.'
        },
        {
          src: 'src/content-loader.js',
          dest: '.',
          rename: 'content.js'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.tsx'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        // Use ES format but we'll make them web accessible
        format: 'es',
        entryFileNames: (chunkInfo) => {
          // Map output files to match manifest.json expectations
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          // Content script is loaded by content-loader, so name it differently
          if (facadeModuleId.includes('content')) return 'content-main.js';
          if (facadeModuleId.includes('background')) return 'background.js';
          if (facadeModuleId.includes('offscreen')) return 'offscreen.js';
          if (facadeModuleId.includes('Popup')) return 'popup.js';
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Extract CSS files to root for easy reference
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('content')) return 'content.css';
            if (assetInfo.name.includes('popup')) return 'popup.css';
            if (assetInfo.name.includes('overlay')) return 'overlay.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: (id) => {
          // Keep React and related libs in a shared chunk
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'react-vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit for larger bundles
    chunkSizeWarningLimit: 5000,
    // Don't minify for easier debugging during development
    minify: false
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
