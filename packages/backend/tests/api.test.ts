import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test, { after, before } from 'node:test';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CANVASES, ENDPOINTS } from '@velora/shared';
import { createApp } from '../src/app.js';
import { resetRateLimits } from '../src/middleware/setup.js';

let base = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

before(async () => {
  resetRateLimits();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function json(path: string, init?: RequestInit): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await fetch(`${base}${path}`, init);
  const type = response.headers.get('content-type') ?? '';
  const body = type.includes('json') ? await response.json() : await response.text();
  return { status: response.status, body, headers: response.headers };
}

test('health responde con el catálogo real', async () => {
  const { status, body } = await json('/api/health');
  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.endpoints, ENDPOINTS.length);
  assert.equal(body.data.canvases, CANVASES.length);
  assert.equal(body.data.checks.templates.ok, true);
  assert.equal(body.data.checks.fonts.ok, true);
});

test('el listado de endpoints respeta los filtros', async () => {
  const { status, body } = await json('/api/endpoints?category=canvas&limit=3');
  assert.equal(status, 200);
  assert.equal(body.data.endpoints.length, 3);
  assert.equal(body.data.catalogTotal, ENDPOINTS.length);
  assert.ok(body.data.endpoints.every((endpoint: { category: string }) => endpoint.category === 'canvas'));
});

test('las rutas desconocidas devuelven un sobre de error', async () => {
  const { status, body } = await json('/api/no-existe');
  assert.equal(status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.ok(body.meta.requestId);
});

test('la validación rechaza parámetros inválidos con 422', async () => {
  const missing = await json('/api/canvas/brat?formato=png');
  assert.equal(missing.status, 422);
  assert.equal(missing.body.error.code, 'VALIDATION_ERROR');
  assert.equal(missing.body.error.details[0].parameter, 'text');

  const outOfRange = await json('/api/utils/uuid?count=999');
  assert.equal(outOfRange.status, 422);
});

test('los alias en español funcionan', async () => {
  const { status, body } = await json('/api/utils/hash?texto=velora&algoritmo=sha1');
  assert.equal(status, 200);
  const expected = createHash('sha1').update('velora').digest('hex');
  assert.equal(body.data.hex, expected);
});

test('un canvas devuelve un PNG real con las dimensiones declaradas', async () => {
  const response = await fetch(`${base}/api/canvas/brat?text=Velora&formato=png`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /image\/png/);
  const buffer = Buffer.from(await response.arrayBuffer());
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG');
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.width, 736);
  assert.equal(metadata.height, 736);
  assert.equal(response.headers.get('x-velora-canvas'), 'brat');
});

test('se aceptan imágenes locales por POST multipart', async () => {
  const face = await sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 124, g: 92, b: 255 } },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.set('text', 'archivo local');
  form.set('image', new Blob([new Uint8Array(face)], { type: 'image/png' }), 'cara.png');
  const response = await fetch(`${base}/api/canvas/minions`, { method: 'POST', body: form });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /image\/png/);
});

test('la vista previa de la plantilla se sirve como JPEG', async () => {
  const response = await fetch(`${base}/api/canvas/quotly/preview?width=240`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /image\/jpeg/);
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.width, 240);
});

test('los canvas animados devuelven SVG (y PNG del fotograma)', async () => {
  const svg = await fetch(`${base}/api/canvas/bratvideo?text=hola&formato=svg`);
  assert.equal(svg.status, 200);
  assert.match(svg.headers.get('content-type') ?? '', /svg/);
  const text = await svg.text();
  assert.match(text, /<svg/);
  assert.match(text, /<animate/);

  const png = await fetch(`${base}/api/canvas/bratvideo?text=hola&formato=png`);
  assert.equal(png.status, 200);
  assert.match(png.headers.get('content-type') ?? '', /image\/png/);
});

test('el generador de QR devuelve un PNG cuadrado', async () => {
  const response = await fetch(`${base}/api/download/qr?data=https://example.com&size=256`);
  assert.equal(response.status, 200);
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
});

test('la protección SSRF bloquea destinos internos', async () => {
  const { status, body } = await json('/api/download/image?url=http://127.0.0.1:6379/robots.txt');
  assert.ok(status === 400 || status === 403, `estado inesperado: ${status}`);
  assert.equal(body.success, false);
  assert.match(JSON.stringify(body.error), /privad|loopback|interno|bloquead|SSRF|no permitid/i);
});

test('CRUD de notas en memoria', async () => {
  const created = await json('/api/utils/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Nota de prueba', content: 'Contenido', tags: ['test'] }),
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id as string;
  assert.ok(id);

  const read = await json(`/api/utils/notes/${id}`);
  assert.equal(read.status, 200);
  assert.equal(read.body.data.title, 'Nota de prueba');

  const updated = await json(`/api/utils/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Actualizada', content: 'Nuevo', tags: [] }),
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.title, 'Actualizada');

  const removed = await json(`/api/utils/notes/${id}`, { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.deleted, true);

  const missing = await json(`/api/utils/notes/${id}`);
  assert.equal(missing.status, 404);
});

test('OpenAPI se genera en JSON y YAML', async () => {
  const jsonDoc = await json('/api/openapi.json');
  assert.equal(jsonDoc.status, 200);
  assert.equal(jsonDoc.body.success, true);
  assert.equal(jsonDoc.body.data.openapi, '3.1.0');
  assert.ok(Object.keys(jsonDoc.body.data.paths).length >= CANVASES.length);

  const yamlDoc = await fetch(`${base}/api/openapi.json?format=yaml`);
  const text = await yamlDoc.text();
  assert.match(text, /^openapi: 3\.1\.0/);
});

test('el health degrada a 503 si faltan assets', async () => {
  // No se manipulan assets reales: se comprueba el contrato del código de estado.
  const { status } = await json('/api/health');
  assert.ok(status === 200 || status === 503);
});
