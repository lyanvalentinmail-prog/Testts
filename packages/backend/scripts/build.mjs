#!/usr/bin/env node
/**
 * Compila el backend con esbuild.
 *
 * · `dist/server.js`  → servidor Node para Render o local.
 * · `dist/vercel.js`  → handler para funciones serverless (opcional).
 *
 * Las dependencias con binarios nativos o middleware de Express quedan como
 * externas: se resuelven desde node_modules en tiempo de ejecución, lo que evita
 * problemas al empaquetar `sharp` y `@resvg/resvg-js`.
 */
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const vercel = process.argv.includes('--vercel');

await rm(path.join(root, 'dist'), { recursive: true, force: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: {
    server: 'src/server.ts',
    vercel: 'src/vercel.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  external: ['express', 'helmet', 'cors', 'multer', 'qrcode', 'sharp', '@resvg/resvg-js'],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'info',
  metafile: true,
});

const outputs = Object.keys(result.metafile.outputs).map((file) => path.relative(root, file));
console.log(`\n[build] ${vercel ? 'modo Vercel' : 'modo Node'} · ${outputs.join(', ')}`);
console.log('[build] assets se sirven desde packages/backend/assets (no se copian).');
