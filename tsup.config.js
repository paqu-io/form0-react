import { defineConfig } from 'tsup';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

const isWatchMode = process.env.TSUP_WATCH === 'true';
const shared = {
  outDir: 'dist',
  esbuildPlugins: [vanillaExtractPlugin()],
  watch: isWatchMode,
  esbuildOptions(options) {
    // Silence the CJS import.meta warning; we guard runtime usage in code.
    options.logOverride = { ...(options.logOverride || {}), 'empty-import-meta': 'silent' };
  },
};

export default defineConfig([
  {
    ...shared,
    entry: ['src/index.js', 'src/theme.css.js'],
    format: ['esm', 'cjs'],
    clean: !isWatchMode,
  },
  {
    ...shared,
    entry: ['src/engine-worker.js'],
    // Worker runs in browsers; ESM avoids import.meta.url warnings in a CJS build.
    format: ['esm'],
    clean: false, // keep library outputs when rebuilding worker
    splitting: false, // single-file worker
    noExternal: ['form0-core'], // bundle the engine into the worker to avoid bare imports in consumers
    platform: 'browser',
  },
]);
