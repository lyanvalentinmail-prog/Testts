import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CANVASES,
  CANVAS_BY_SLUG,
  CATEGORIES,
  ENDPOINTS,
  ENDPOINTS_BY_ID,
  STATS,
  categoryWithCounts,
  validateParams,
} from '@velora/shared';
import { buildOpenApi } from '../src/services/openapi.js';
import { assetsDir } from '../src/lib/assets.js';
import { registeredRouteIds } from '../src/routes/registry.js';

test('el catálogo tiene ids y rutas únicas', () => {
  assert.ok(ENDPOINTS.length >= 90, `se esperaban >= 90 endpoints, hay ${ENDPOINTS.length}`);
  const ids = new Set<string>();
  const routes = new Set<string>();
  for (const endpoint of ENDPOINTS) {
    assert.ok(!ids.has(endpoint.id), `id duplicado: ${endpoint.id}`);
    ids.add(endpoint.id);
    const key = `${endpoint.method} ${endpoint.path}`;
    assert.ok(!routes.has(key), `ruta duplicada: ${key}`);
    routes.add(key);
    assert.match(endpoint.path, /^\/api(\/|$)/);
    assert.ok(endpoint.description.length > 30, `descripción demasiado corta en ${endpoint.id}`);
    assert.ok(
      endpoint.responses.some((response) => response.status >= 200 && response.status < 300),
      `sin respuesta de éxito en ${endpoint.id}`
    );
  }
});

test('cada categoría declara su recuento real', () => {
  const withCounts = categoryWithCounts();
  assert.equal(withCounts.length, CATEGORIES.length);
  assert.equal(withCounts.reduce((sum, category) => sum + category.count, 0), ENDPOINTS.length);
  assert.equal(STATS.endpoints, ENDPOINTS.length);
  assert.equal(STATS.canvases, CANVASES.length);
  for (const category of withCounts) {
    assert.ok(category.count > 0, `categoría vacía: ${category.id}`);
  }
});

test('todos los canvas están expuestos como endpoints y tienen plantilla real', () => {
  assert.equal(CANVASES.length, STATS.canvases);
  for (const canvas of CANVASES) {
    const endpoint = ENDPOINTS_BY_ID[`canvas.${canvas.slug}`];
    assert.ok(endpoint, `falta el endpoint canvas.${canvas.slug}`);
    assert.equal(endpoint.category, 'canvas');
    assert.equal(endpoint.output, 'image');
    assert.ok(CANVAS_BY_SLUG[canvas.slug], `canvas no registrado por slug: ${canvas.slug}`);
    const extension = canvas.media === 'video' ? 'mp4' : 'jpg';
    const file = path.join(assetsDir(), 'canvas', `${canvas.template}.${extension}`);
    const fallback = path.join(assetsDir(), 'canvas', `${canvas.template}.jpg`);
    assert.ok(existsSync(file) || existsSync(fallback), `plantilla ausente para ${canvas.slug}`);
    assert.ok(canvas.width >= 64 && canvas.height >= 64);
  }
});

test('los parámetros por defecto pasan la validación', () => {
  for (const endpoint of ENDPOINTS) {
    const input: Record<string, unknown> = {};
    for (const param of endpoint.params) {
      if (param.in === 'path') continue;
      if (param.default !== undefined) input[param.name] = param.default;
    }
    const provided = new Set(Object.keys(input));
    const { errors } = validateParams(endpoint.params, input);
    const relevant = errors.filter((error) => provided.has(error.parameter));
    assert.deepEqual(relevant, [], `${endpoint.id}: ${JSON.stringify(relevant)}`);
  }
});

test('los parámetros de ruta aparecen en la plantilla de la ruta', () => {
  for (const endpoint of ENDPOINTS) {
    for (const param of endpoint.params.filter((item) => item.in === 'path')) {
      assert.ok(
        endpoint.path.includes(`{${param.name}}`),
        `${endpoint.id}: la ruta no contiene {${param.name}}`
      );
    }
  }
});

test('las rutas registradas cubren el catálogo', () => {
  const registered = new Set(registeredRouteIds());
  for (const endpoint of ENDPOINTS) {
    assert.ok(registered.has(endpoint.id), `sin handler registrado: ${endpoint.id}`);
  }
});

test('OpenAPI contiene todos los paths del catálogo', () => {
  const document = buildOpenApi('http://localhost:4000') as {
    openapi: string;
    paths: Record<string, Record<string, unknown>>;
    components: { schemas: Record<string, unknown> };
  };
  assert.equal(document.openapi, '3.1.0');
  assert.ok(document.paths['/api/health'], 'falta /api/health en OpenAPI');
  const operations = Object.values(document.paths).reduce((sum, item) => sum + Object.keys(item).length, 0);
  assert.ok(operations >= ENDPOINTS.length, `OpenAPI expone ${operations} operaciones de ${ENDPOINTS.length}`);
  assert.ok(document.components.schemas.SuccessEnvelope);
  assert.ok(document.components.schemas.ErrorEnvelope);
});
