const esbuild = require('esbuild');
const { glsl } = require('esbuild-plugin-glsl');
esbuild
  .build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    outdir: 'dist',
    plugins: [glsl({ minify: true })],
  })
  .catch(() => process.exit(1));
