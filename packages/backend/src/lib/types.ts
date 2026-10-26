import type { NextFunction, Request, Response } from 'express';
import type { ParamValue } from '@velora/shared';

export interface RequestMeta {
  requestId: string;
  startedAt: number;
  ip: string;
  baseUrl: string;
  userAgent: string;
  /** Valores normalizados tras la validación. */
  values: Record<string, ParamValue>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      meta: RequestMeta;
      /** Resultado de validar la query contra el catálogo. */
      query_: Record<string, ParamValue>;
      /** Resultado de validar los segmentos de ruta contra el catálogo. */
      params_: Record<string, ParamValue>;
      body_: Record<string, ParamValue>;
      validated: boolean;
    }
  }
}

export type Handler = (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: {
    requestId: string;
    durationMs: number;
    cached: boolean;
    timestamp: string;
  };
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    hint?: string;
  };
  meta: {
    requestId: string;
    durationMs: number;
    timestamp: string;
  };
}
