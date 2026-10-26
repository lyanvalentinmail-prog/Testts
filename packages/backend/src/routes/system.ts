import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { validatePath, validateQuery } from '../middleware/validate.js';
import {
  CANVASES,
  CATEGORIES,
  ENDPOINTS,
  endpointById,
  searchEndpoints,
  STATS,
  categoryWithCounts,
} from '@velora/shared';
import { config } from '../config.js';
import { assetsDir, fontFiles, listTemplates } from '../lib/assets.js';
import { providerCache } from '../lib/cache.js';
import { ApiError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { stats } from '../lib/stats.js';
import { buildOpenApi, toYaml } from '../services/openapi.js';

export const systemRouter = Router();

systemRouter.get('/health', validateQuery('system.health'), async (_req, res) => {
  let assetsOk = true;
  let templates: string[] = [];
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  try {
    templates = await listTemplates();
    const fonts = fontFiles();
    checks.assets = { ok: true, detail: assetsDir() };
    checks.templates = { ok: templates.length >= CANVASES.length - 4, detail: `${templates.length} archivos` };
    checks.fonts = { ok: fonts.length > 0, detail: `${fonts.length} fuentes` };
    assetsOk = checks.templates.ok && checks.fonts.ok;
  } catch (error) {
    assetsOk = false;
    checks.assets = { ok: false, detail: (error as Error).message };
  }

  checks.express = { ok: true, detail: process.version };
  checks.providers = { ok: true, detail: 'configurados' };

  const status = assetsOk ? 200 : 503;
  ok(
    res,
    {
      status: assetsOk ? 'ok' : 'degraded',
      version: config.version,
      environment: config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      node: process.version,
      memoryMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
      endpoints: ENDPOINTS.length,
      canvases: CANVASES.length,
      rateLimit: config.rateLimit,
      checks,
    },
    { status, headers: { 'Cache-Control': 'no-store' } }
  );
});

systemRouter.get('/stats', validateQuery('system.stats'), (_req, res) => {
  ok(
    res,
    {
      ...stats.snapshot(),
      catalog: STATS,
      cache: providerCache.stats(),
      memory: process.memoryUsage(),
      environment: config.nodeEnv,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

systemRouter.get('/categories', validateQuery('system.categories'), (_req, res) => {
  const rows = categoryWithCounts().map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    tagline: category.tagline,
    description: category.description,
    icon: category.icon,
    accent: category.accent,
    count: category.count,
    endpoints: ENDPOINTS.filter((endpoint) => endpoint.category === category.id).map((endpoint) => ({
      id: endpoint.id,
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
    })),
  }));
  ok(res, { total: rows.length, categories: rows }, { headers: { 'Cache-Control': 'public, max-age=300' } });
});

systemRouter.get('/endpoints', validateQuery('system.endpoints'), (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const method = typeof req.query.method === 'string' ? req.query.method : undefined;
  const format = typeof req.query.format === 'string' ? req.query.format : 'full';
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 100);

  if (category && !CATEGORIES.some((item) => item.id === category)) {
    throw ApiError.badRequest(`La categoría «${category}» no existe.`, {
      disponibles: CATEGORIES.map((item) => item.id),
    });
  }

  const found = searchEndpoints({ ...(q ? { q } : {}), ...(category ? { category } : {}), ...(method ? { method } : {}), limit });

  const data =
    format === 'summary'
      ? found.map((endpoint) => ({
          id: endpoint.id,
          name: endpoint.name,
          method: endpoint.method,
          path: endpoint.path,
          category: endpoint.category,
          summary: endpoint.summary,
          output: endpoint.output,
        }))
      : found;

  ok(res, {
    total: found.length,
    catalogTotal: ENDPOINTS.length,
    filters: { q: q ?? null, category: category ?? null, method: method ?? null, format },
    endpoints: data,
  });
});

systemRouter.get('/endpoints/:id', validatePath('system.endpoint'), validateQuery('system.endpoint'), (req, res) => {
  const endpoint = endpointById(req.params.id as string);
  if (!endpoint) {
    throw ApiError.notFound(`No existe el endpoint «${req.params.id}».`, {
      pista: 'Usa /api/endpoints o /api/search/endpoints para buscar uno.',
    });
  }
  ok(res, endpoint);
});

systemRouter.get('/openapi.json', validateQuery('system.openapi'), (req, res) => {
  const format = String(req.query.format ?? 'json').toLowerCase();
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const document = buildOpenApi(serverUrl);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (format === 'yaml' || format === 'yml') {
    res.type('text/yaml; charset=utf-8');
    return res.send(toYaml(document));
  }
  if (format !== 'json') {
    throw ApiError.badRequest('El formato debe ser json o yaml.', { format });
  }
  return ok(res, document, { headers: { 'Cache-Control': 'public, max-age=600' } });
});

systemRouter.get('/echo', validateQuery('system.echo'), (req, res) => {
  const detail = String(req.query.format ?? 'basic');
  const query = Object.fromEntries(Object.entries(req.query).filter(([key]) => key !== 'format'));
  const headers =
    detail === 'headers'
      ? {
          'user-agent': req.headers['user-agent'] ?? null,
          accept: req.headers.accept ?? null,
          'accept-language': req.headers['accept-language'] ?? null,
          'content-type': req.headers['content-type'] ?? null,
          referer: req.headers.referer ?? null,
          'x-forwarded-for': req.headers['x-forwarded-for'] ?? null,
        }
      : undefined;
  ok(res, {
    method: req.method,
    path: req.path,
    url: req.originalUrl,
    ip: req.meta.ip,
    requestId: req.meta.requestId,
    query,
    ...(headers ? { headers } : {}),
    server: { version: config.version, environment: config.nodeEnv },
  });
});

/** Comprueba que existe la carpeta de assets (se usa en el arranque). */
export async function healthcheckAssets(): Promise<{ ok: boolean; detail: string }> {
  try {
    const files = await readdir(path.join(assetsDir(), 'canvas'));
    return { ok: files.length > 0, detail: `${files.length} plantillas` };
  } catch (error) {
    return { ok: false, detail: (error as Error).message };
  }
}
