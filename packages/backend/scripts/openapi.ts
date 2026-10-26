#!/usr/bin/env tsx
/**
 * Genera la documentación estática a partir del catálogo:
 *   · docs/openapi.json
 *   · docs/openapi.yaml
 *   · docs/ENDPOINTS.md
 *
 * Uso: npm run openapi
 *      OPENAPI_SERVER_URL=https://mi-api.onrender.com npm run openapi
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANVASES, CATEGORIES, ENDPOINTS, STATS } from '@velora/shared';
import { buildOpenApi, toYaml } from '../src/services/openapi.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(here, '../../../docs');
const serverUrl = process.env.OPENAPI_SERVER_URL ?? 'http://localhost:4000';

const document = buildOpenApi(serverUrl);
await mkdir(docsDir, { recursive: true });
await writeFile(path.join(docsDir, 'openapi.json'), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
await writeFile(path.join(docsDir, 'openapi.yaml'), toYaml(document), 'utf8');

const lines: string[] = [
  '# Catálogo de endpoints',
  '',
  `Generado desde \`packages/shared\` el ${new Date().toISOString().slice(0, 10)}. ` +
    `**${STATS.endpoints} endpoints** en ${STATS.categories} categorías (${STATS.canvases} canvas).`,
  '',
  '| Categoría | Endpoints |',
  '| --- | --- |',
  ...CATEGORIES.map(
    (category) =>
      `| [${category.name}](#${category.slug}) | ${ENDPOINTS.filter((endpoint) => endpoint.category === category.id).length} |`
  ),
  '',
];

for (const category of CATEGORIES) {
  const endpoints = ENDPOINTS.filter((endpoint) => endpoint.category === category.id);
  lines.push(`## ${category.name}`, '', `${category.description}`, '');
  lines.push('| Método | Ruta | Nombre | Salida | Parámetros |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const endpoint of endpoints) {
    const params = endpoint.params.length ? String(endpoint.params.length) : '—';
    lines.push(
      `| \`${endpoint.method}\` | \`${endpoint.path}\` | ${endpoint.name} | ${endpoint.output} | ${params} |`
    );
  }
  lines.push('');
}

lines.push(
  '## Notas',
  '',
  `- Una especificación OpenAPI 3.1 completa está en [openapi.json](./openapi.json) y [openapi.yaml](./openapi.yaml).`,
  `- Las plantillas de los ${CANVASES.length} canvas proceden de la carpeta «CategoriaCanvas» de Google Drive y viven en \`packages/backend/assets/canvas\`.`,
  '- Los ejemplos de respuesta del frontend se guardan en `packages/frontend/src/lib/examples.ts`.',
  ''
);

await writeFile(path.join(docsDir, 'ENDPOINTS.md'), lines.join('\n'), 'utf8');

console.log('docs/openapi.json · docs/openapi.yaml · docs/ENDPOINTS.md');
console.log(`${ENDPOINTS.length} endpoints · servidor: ${serverUrl}`);
