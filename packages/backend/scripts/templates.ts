#!/usr/bin/env tsx
/**
 * Verifica que cada canvas del catálogo tenga su plantilla real en
 * `assets/canvas` y que las dimensiones declaradas coincidan con el archivo.
 *
 * Uso: npm run templates -w @velora/backend
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CANVASES } from '@velora/shared';
import { assetsDir, imageSize, templateFilePath } from '../src/lib/assets.js';

const root = assetsDir();
let failures = 0;
let checked = 0;
const rows: string[] = [];

for (const canvas of CANVASES) {
  const resolved = await templateFilePath(canvas.template);
  if (!resolved) {
    failures += 1;
    rows.push(`✗ ${canvas.slug.padEnd(22)} falta la plantilla «${canvas.template}»`);
    continue;
  }
  const relative = path.relative(root, resolved.file);
  const ext = path.extname(resolved.file).toLowerCase();
  let detail = '';
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
    const buffer = await readFile(resolved.file);
    const size = imageSize(buffer, ext);
    checked += 1;
    if (size.width !== canvas.width || size.height !== canvas.height) {
      failures += 1;
      detail = `⚠ ${size.width}×${size.height} declarado ${canvas.width}×${canvas.height}`;
    } else {
      detail = `${size.width}×${size.height}`;
    }
  } else {
    detail = `${(await readFile(resolved.file)).length} bytes`;
  }
  rows.push(`✓ ${canvas.slug.padEnd(22)} ${relative.padEnd(34)} ${detail}`);
}

console.log(rows.join('\n'));
console.log(`\n${CANVASES.length} canvas · ${checked} imágenes verificadas · ${failures} problemas`);

if (failures > 0) process.exit(1);
