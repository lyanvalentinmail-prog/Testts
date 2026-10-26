/**
 * Configuración del backend, siempre a través de variables de entorno.
 * Ningún secreto se expone al frontend: solo se publica `publicConfig`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** Raíz del paquete backend, tanto en `src/` (tsx) como en `dist/` (build). */
export const PACKAGE_ROOT = path.resolve(here, '..');

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on', 'si', 'sí'].includes(value.toLowerCase());
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  version: process.env.npm_package_version ?? '1.0.0',
  port: num(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL ?? (nodeEnv === 'production' ? 'info' : 'debug')) as
    | 'silent'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug',

  /** Orígenes permitidos por CORS. `*` en desarrollo si no se configura nada. */
  corsOrigins: (() => {
    const raw = process.env.CORS_ORIGINS;
    if (raw === undefined) return nodeEnv === 'production' ? [] : ['*'];
    if (raw.trim() === '*') return ['*'];
    return list(raw);
  })(),

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: num(process.env.RATE_LIMIT_MAX, 120),
    /** Endpoints de imagen tienen un límite independiente (más generoso). */
    imageMax: num(process.env.RATE_LIMIT_IMAGE_MAX, 60),
    trustProxy: bool(process.env.TRUST_PROXY, true),
  },

  http: {
    timeoutMs: num(process.env.HTTP_TIMEOUT_MS, 9_000),
    maxBytes: num(process.env.HTTP_MAX_BYTES, 8 * 1024 * 1024),
    maxRedirects: num(process.env.HTTP_MAX_REDIRECTS, 3),
    userAgent: process.env.HTTP_USER_AGENT ?? 'VeloraAPI/1.0 (+https://github.com/lyanvalentinmail-prog/Testts)',
  },

  /** Permite objetivos privados solo para pruebas locales (nunca por defecto). */
  allowPrivateTargets: bool(process.env.ALLOW_PRIVATE_TARGETS, false),
  allowedPrivateHosts: list(process.env.ALLOWED_PRIVATE_HOSTS),

  uploads: {
    maxBytes: num(process.env.UPLOAD_MAX_BYTES, 8 * 1024 * 1024),
    maxFiles: 2,
  },

  cache: {
    /** TTL de las respuestas de proveedores externos (ms). */
    providerTtlMs: num(process.env.CACHE_PROVIDER_TTL_MS, 5 * 60_000),
    maxEntries: num(process.env.CACHE_MAX_ENTRIES, 500),
  },

  secrets: {
    githubToken: process.env.GITHUB_TOKEN ?? '',
    /** API key opcional: si se define, los endpoints públicos exigen X-API-Key. */
    apiKey: process.env.VELORA_API_KEY ?? '',
  },

  /** Bases de URL de los proveedores (sobrescribibles para pruebas). */
  providers: {
    jikan: process.env.JIKAN_BASE_URL ?? 'https://api.jikan.moe/v4',
    openverse: process.env.OPENVERSE_BASE_URL ?? 'https://api.openverse.org/v1',
    lrclib: process.env.LRCLIB_BASE_URL ?? 'https://lrclib.net/api',
    wikipedia: process.env.WIKIPEDIA_BASE_URL ?? 'https://{lang}.wikipedia.org/w/api.php',
    github: process.env.GITHUB_API_BASE_URL ?? 'https://api.github.com',
    openlibrary: process.env.OPENLIBRARY_BASE_URL ?? 'https://openlibrary.org',
    itunes: process.env.ITUNES_BASE_URL ?? 'https://itunes.apple.com',
    hn: process.env.HN_BASE_URL ?? 'https://hn.algolia.com/api/v1',
    duckduckgo: process.env.DUCKDUCKGO_BASE_URL ?? 'https://html.duckduckgo.com',
  },

  /** Sirve el frontend compilado (Render / ejecución local de producción). */
  serveFrontend: bool(process.env.SERVE_FRONTEND, true),
  frontendDir: process.env.FRONTEND_DIR ?? path.resolve(PACKAGE_ROOT, '../frontend/dist'),

  assetsDir: process.env.ASSETS_DIR ?? path.resolve(PACKAGE_ROOT, 'assets'),
} as const;

export const publicConfig = {
  name: 'Velora API',
  version: config.version,
  environment: config.nodeEnv,
  docs: '/docs',
  openapi: '/api/openapi.json',
  rateLimit: { windowMs: config.rateLimit.windowMs, max: config.rateLimit.max },
  corsOrigins: config.corsOrigins,
} as const;
