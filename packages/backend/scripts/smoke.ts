#!/usr/bin/env tsx
/**
 * Smoke test manual contra una instancia recién arrancada.
 *
 * Arranca la app en un puerto efímero, ejecuta una batería de peticiones reales
 * y muestra un resumen. Sale con código 1 si alguna comprobación falla.
 *
 * Uso: npm run smoke -w @velora/backend
 */
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { CANVASES, ENDPOINTS } from '@velora/shared';
import { createApp } from '../src/app.js';
import { resetRateLimits } from '../src/middleware/setup.js';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(42)} ${detail}`);
}

resetRateLimits();
const app = createApp();
const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
  const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
});
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

try {
  const health = await fetch(`${base}/api/health`);
  const healthBody = (await health.json()) as { data?: { status?: string; endpoints?: number } };
  record('health', health.status === 200, `${health.status} · ${healthBody.data?.status} · ${healthBody.data?.endpoints} endpoints`);

  const catalog = await fetch(`${base}/api/endpoints?limit=100`);
  const catalogBody = (await catalog.json()) as { data?: { catalogTotal?: number } };
  record(
    'catálogo completo',
    catalogBody.data?.catalogTotal === ENDPOINTS.length,
    `${catalogBody.data?.catalogTotal}/${ENDPOINTS.length}`
  );

  const canvasSample = CANVASES.find((canvas) => canvas.slug === 'brat')!;
  const canvasResponse = await fetch(`${base}/api/canvas/${canvasSample.slug}?text=smoke&formato=png`);
  const canvasBuffer = Buffer.from(await canvasResponse.arrayBuffer());
  const canvasMeta = canvasResponse.ok ? await sharp(canvasBuffer).metadata() : null;
  record(
    'canvas PNG',
    canvasResponse.status === 200 && canvasResponse.headers.get('content-type')?.includes('png') === true,
    `${canvasResponse.status} · ${canvasMeta?.width}×${canvasMeta?.height} · ${canvasBuffer.length} B`
  );

  const preview = await fetch(`${base}/api/canvas/quotly/preview?width=200`);
  record('vista previa de plantilla', preview.status === 200, `${preview.status} · ${preview.headers.get('content-type')}`);

  const qr = await fetch(`${base}/api/download/qr?data=velora&size=200`);
  record('QR PNG', qr.status === 200, `${qr.status} · ${(await qr.arrayBuffer()).byteLength} B`);

  const slug = await fetch(`${base}/api/utils/slug?text=Hola%20Velora%20API`);
  const slugBody = (await slug.json()) as { data?: { slug?: string } };
  record('utilidad slug', slugBody.data?.slug === 'hola-velora-api', String(slugBody.data?.slug));

  const emoji = await fetch(`${base}/api/search/emoji?q=fire&limit=2`);
  const emojiBody = (await emoji.json()) as { data?: { total?: number; returned?: number } };
  record('dataset emojis', emojiBody.data?.total === 9, `${emojiBody.data?.total} coincidencias`);

  const validation = await fetch(`${base}/api/canvas/brat`);
  const validationBody = (await validation.json()) as { error?: { code?: string } };
  record('validación 422', validation.status === 422 && validationBody.error?.code === 'VALIDATION_ERROR', `${validation.status} ${validationBody.error?.code}`);

  const missing = await fetch(`${base}/api/ruta-inexistente`);
  const missingBody = (await missing.json()) as { error?: { code?: string } };
  record('404 consistente', missing.status === 404 && missingBody.error?.code === 'NOT_FOUND', `${missing.status} ${missingBody.error?.code}`);

  const ssrf = await fetch(`${base}/api/download/image?url=http://127.0.0.1:6379/x`);
  record('bloqueo SSRF', ssrf.status === 400 || ssrf.status === 403, `${ssrf.status}`);

  const openapi = await fetch(`${base}/api/openapi.json`);
  const openapiBody = (await openapi.json()) as { data?: { paths?: Record<string, unknown> } };
  record('OpenAPI', openapi.status === 200 && Boolean(openapiBody.data?.paths), `${Object.keys(openapiBody.data?.paths ?? {}).length} paths`);

  const note = await fetch(`${base}/api/utils/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Smoke test', content: 'Nota temporal', tags: ['smoke'] }),
  });
  const noteBody = (await note.json()) as { data?: { id?: string } };
  const noteId = noteBody.data?.id ?? '';
  const removed = noteId ? await fetch(`${base}/api/utils/notes/${noteId}`, { method: 'DELETE' }) : null;
  record('CRUD de notas', note.status === 201 && removed?.status === 200, `POST ${note.status} · DELETE ${removed?.status}`);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} comprobaciones correctas`);
if (failed.length > 0) {
  console.error('Fallos:', failed.map((check) => check.name).join(', '));
  process.exit(1);
}
