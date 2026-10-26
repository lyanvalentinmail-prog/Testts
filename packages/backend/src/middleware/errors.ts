import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ENDPOINTS, searchEndpoints } from '@velora/shared';
import { config } from '../config.js';
import { ApiError, isApiError } from '../lib/errors.js';
import { fail } from '../lib/respond.js';

export function notFoundHandler(req: Request, res: Response): void {
  const suggestions = searchEndpoints({ q: req.path.replace(/^\/api\/?/, ''), limit: 5 }).map((endpoint) => endpoint.path);
  fail(res, 404, 'NOT_FOUND', `La ruta ${req.method} ${req.path} no existe en Velora API.`, {
    details: {
      totalEndpoints: ENDPOINTS.length,
      indice: '/api/endpoints',
      documentacion: '/api/openapi.json',
      ...(suggestions.length ? { sugerencias: suggestions } : {}),
    },
    hint: 'Consulta /api/endpoints o la web de documentación para ver las rutas disponibles.',
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(error);

  if (error instanceof MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    fail(res, status, error.code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', `Error al procesar el archivo: ${error.message}`, {
      hint:
        error.code === 'LIMIT_FILE_SIZE'
          ? `El tamaño máximo por archivo es de ${(config.uploads.maxBytes / 1024 / 1024).toFixed(0)} MB.`
          : 'Envía la imagen en un campo llamado image o image2.',
    });
    return;
  }

  if (isApiError(error)) {
    fail(res, error.status, error.code, error.message, {
      ...(error.details !== undefined ? { details: error.details } : {}),
      ...(error.hint ? { hint: error.hint } : {}),
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    fail(res, 400, 'BAD_REQUEST', 'El cuerpo JSON no es válido.', {
      hint: 'Revisa las comillas y las comas del JSON enviado.',
    });
    return;
  }

  const status = (error as { status?: number })?.status ?? 500;
  const message =
    status < 500 ? ((error as Error)?.message ?? 'Petición inválida.') : 'Error interno del servidor.';

  if (status >= 500) {
    console.error('[velora] error no controlado:', {
      requestId: req.meta?.requestId,
      method: req.method,
      path: req.path,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }

  fail(res, status, status < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR', message, {
    details: config.isProduction ? undefined : error instanceof Error ? { stack: error.stack?.split('\n').slice(0, 5) } : undefined,
  });
}
