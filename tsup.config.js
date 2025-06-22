import { defineConfig } from 'tsup';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';

export default defineConfig({
  entry: ['src/index.js', 'src/theme.css.js'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  esbuildPlugins: [vanillaExtractPlugin()],
  watch: true
});