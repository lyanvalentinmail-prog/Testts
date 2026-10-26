import type { NextFunction, Request, Response } from 'express';
import { coerce, endpointById, validateParams, type ParamValue } from '@velora/shared';
import { ApiError } from '../lib/errors.js';

/**
 * Valida la query string contra la definición del endpoint del catálogo.
 * Deja los valores normalizados en `req.query_`.
 */
export function validateQuery(endpointId: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const endpoint = endpointById(endpointId);
    if (!endpoint) return next(ApiError.internal(`Endpoint desconocido en el catálogo: ${endpointId}`));
    const { values, errors } = validateParams(endpoint.params, req.query as Record<string, unknown>);
    if (errors.length) {
      return next(
        ApiError.validation(
          errors.map((error) => ({
            parameter: error.parameter,
            in: 'query',
            message: error.message,
          }))
        )
      );
    }
    req.query_ = values;
    req.meta.values = values;
    req.validated = true;
    next();
  };
}

/** Igual que `validateQuery` pero para el cuerpo JSON (POST/PUT). */
export function validateBody(endpointId: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const endpoint = endpointById(endpointId);
    if (!endpoint) return next(ApiError.internal(`Endpoint desconocido en el catálogo: ${endpointId}`));
    if (!endpoint.requestBody) {
      req.body_ = {};
      return next();
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body !== 'object' || Array.isArray(body)) {
      return next(ApiError.badRequest('El cuerpo debe ser un objeto JSON.'));
    }
    req.body_ = body as Record<string, ParamValue>;
    next();
  };
}

/** Valida los segmentos de ruta declarados en el catálogo (`{id}`, `{slug}`…). */
export function validatePath(endpointId: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const endpoint = endpointById(endpointId);
    if (!endpoint) return next(ApiError.internal(`Endpoint desconocido en el catálogo: ${endpointId}`));
    const values: Record<string, ParamValue> = {};
    for (const param of endpoint.params.filter((item) => item.in === 'path')) {
      const raw = (req.params as Record<string, string | undefined>)[param.name];
      if (raw === undefined) continue;
      const { value, error } = coerce(param, raw);
      if (error) {
        return next(
          ApiError.validation([{ parameter: param.name, in: 'path', message: error }])
        );
      }
      if (value !== undefined) values[param.name] = value;
    }
    req.params_ = values;
    next();
  };
}

/** Lee un parámetro validado con su alias. */
export function param(req: Request, name: string, aliases: string[] = []): string {
  const direct = req.query_[name];
  if (direct !== undefined && direct !== '') return String(direct);
  const raw = req.query as Record<string, unknown>;
  if (raw[name] !== undefined && raw[name] !== '') return String(raw[name]);
  for (const alias of aliases) {
    if (raw[alias] !== undefined && raw[alias] !== '') return String(raw[alias]);
  }
  return '';
}

export function numberParam(req: Request, name: string, fallback: number): number {
  const value = req.query_[name];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function boolParam(req: Request, name: string, fallback = false): boolean {
  const value = req.query_[name];
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}
