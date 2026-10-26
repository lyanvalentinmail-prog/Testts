import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { config } from '../config.js';
import { RateLimiter } from '../lib/rate-limit.js';
import { stats } from '../lib/stats.js';
import { ApiError } from '../lib/errors.js';

const generalLimiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);
const imageLimiter = new RateLimiter(config.rateLimit.imageMax, config.rateLimit.windowMs);

/** Cabeceras de seguridad y compresión lógica de la API. */
export function applySecurity(app: Express): void {
  app.disable('x-powered-by');
  if (config.rateLimit.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Velora-Cache', 'X-Request-Id', 'Retry-After'],
      maxAge: 86400,
    })
  );

  app.use((req, res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.meta = {
      requestId,
      startedAt: Date.now(),
      ip: req.ip ?? 'desconocida',
      baseUrl: `${req.protocol}://${req.get('host') ?? 'localhost'}`,
      userAgent: String(req.headers['user-agent'] ?? ''),
      values: {},
    };
    req.query_ = {};
    req.params_ = {};
    req.body_ = {};
    req.validated = false;
    res.setHeader('X-Request-Id', requestId);
    stats.requestStarted();
    res.on('finish', () => {
      stats.requestFinished(res.statusCode, Date.now() - req.meta.startedAt);
    });
    next();
  });

  app.use((req, res, next) => {
    const isImage = req.path.startsWith('/api/canvas') || req.path.startsWith('/api/download/photo');
    const limiter = isImage ? imageLimiter : generalLimiter;
    const result = limiter.check(req.meta.ip);
    if (result.limit > 0) {
      res.setHeader('X-RateLimit-Limit', String(result.limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(result.resetSeconds));
    }
    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      throw ApiError.rateLimited(
        `Has superado el límite de ${result.limit} peticiones por minuto. Reintenta en ${result.retryAfterSeconds} s.`
      );
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}

/** API key opcional: solo se exige si VELORA_API_KEY está definida en el servidor. */
export function apiKeyGuard(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  if (!config.secrets.apiKey) return next();
  // El health check y la documentación pública quedan siempre accesibles
  // (el guard se monta en /api, así que req.path llega sin el prefijo).
  if (req.path === '/health' || req.path === '/openapi.json') return next();
  const provided =
    (req.headers['x-api-key'] as string) ||
    (String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '') as string) ||
    (typeof req.query.apikey === 'string' ? req.query.apikey : '');
  if (provided !== config.secrets.apiKey) return next(ApiError.unauthorized());
  next();
}

export function resetRateLimits(): void {
  generalLimiter.reset();
  imageLimiter.reset();
}
