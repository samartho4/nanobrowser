import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { isDev, isProduction, watchOption } from '@extension/vite-config';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');
const outDir = resolve(rootDir, '..', 'dist');

export default defineConfig({
  resolve: {
    alias: {
      '@root': rootDir,
      '@src': srcDir,
    },
  },
  build: {
    lib: {
      formats: ['iife'],
      entry: resolve(__dirname, 'src/content/inject-nano.ts'),
      name: 'NanoInject',
      fileName: 'content/inject-nano',
    },
    outDir,
    emptyOutDir: false,
    sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    watch: watchOption,
    rollupOptions: {
      output: {
        entryFileNames: 'content/inject-nano.js',
      },
    },
  },
});
