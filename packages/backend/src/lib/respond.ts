import type { Response } from 'express';

export interface RespondOptions {
  status?: number;
  cached?: boolean;
  headers?: Record<string, string | number>;
}

function meta(res: Response, cached = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRes = res as any;
  return {
    requestId: (anyRes.req?.meta?.requestId as string) ?? 'unknown',
    durationMs: anyRes.req?.meta?.startedAt ? Date.now() - anyRes.req.meta.startedAt : 0,
    cached,
    timestamp: new Date().toISOString(),
  };
}

/** Respuesta JSON con el sobre estándar `{ success, data, meta }`. */
export function ok<T>(res: Response, data: T, options: RespondOptions = {}): Response {
  const status = options.status ?? 200;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRes = res as any;
  if (options.headers) res.set(options.headers);
  res.status(status);
  if (options.cached) res.setHeader('X-Velora-Cache', 'HIT');
  return res.json({ success: true, data, meta: meta(res, options.cached) });
}

/** Texto plano (usado por `format=txt` o `format=lrc`). */
export function text(res: Response, body: string, options: RespondOptions = {}): Response {
  if (options.headers) res.set(options.headers);
  res.status(options.status ?? 200);
  res.type('text/plain; charset=utf-8');
  return res.send(body);
}

/** Envía un buffer binario (imágenes, archivos, QR…). */
export function binary(
  res: Response,
  body: Buffer,
  contentType: string,
  options: RespondOptions & { filename?: string; download?: boolean; cacheSeconds?: number } = {}
): Response {
  if (options.headers) res.set(options.headers);
  res.status(options.status ?? 200);
  res.type(contentType);
  res.setHeader('Content-Length', String(body.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (options.cacheSeconds) {
    res.setHeader('Cache-Control', `public, max-age=${options.cacheSeconds}, stale-while-revalidate=86400`);
  }
  if (options.filename) {
    const disposition = options.download ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${options.filename.replace(/"/g, '')}"`);
  }
  return res.send(body);
}

/** Redirección temporal con cabeceras de caché cortas. */
export function redirect(res: Response, url: string, status = 302): Response {
  res.status(status);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.redirect(status, url);
  return res;
}

/** Respuesta de error con el sobre estándar. */
export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  extra: { details?: unknown; hint?: string; headers?: Record<string, string | number> } = {}
): Response {
  if (extra.headers) res.set(extra.headers);
  res.status(status);
  return res.json({
    success: false,
    error: {
      code,
      message,
      ...(extra.details !== undefined ? { details: extra.details } : {}),
      ...(extra.hint ? { hint: extra.hint } : {}),
    },
    meta: meta(res),
  });
}
