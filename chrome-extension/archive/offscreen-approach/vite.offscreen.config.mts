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
      '@assets': resolve(srcDir, 'assets'),
    },
  },
  build: {
    lib: {
      formats: ['iife'],
      entry: resolve(__dirname, 'src/offscreen/offscreen.ts'),
      name: 'OffscreenDocument',
      fileName: 'offscreen/offscreen',
    },
    outDir,
    emptyOutDir: false,
    sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    watch: watchOption,
    rollupOptions: {
      external: ['chrome'],
      output: {
        entryFileNames: 'offscreen/offscreen.js',
      },
    },
  },
});
