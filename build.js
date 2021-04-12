import esbuild from 'esbuild';
import { glsl } from 'esbuild-plugin-glsl';

esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    minify: true,
    outdir: 'dist',
    plugins: [glsl({ minify: true })],
  })
  .catch(() => process.exit(1));
