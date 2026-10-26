/** Errores HTTP tipados con código estable para el cliente. */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RATE_LIMITED'
  | 'UPSTREAM_BLOCKED'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly hint?: string;

  constructor(status: number, code: ErrorCode, message: string, options: { details?: unknown; hint?: string } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (options.details !== undefined) this.details = options.details;
    if (options.hint !== undefined) this.hint = options.hint;
  }

  static badRequest(message: string, details?: unknown, hint?: string): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, { details, hint });
  }

  static validation(errors: unknown): ApiError {
    return new ApiError(422, 'VALIDATION_ERROR', 'Hay parámetros inválidos en la petición.', {
      details: errors,
      hint: 'Revisa los parámetros marcados en la documentación del endpoint.',
    });
  }

  static notFound(message = 'Recurso no encontrado.', details?: unknown): ApiError {
    return new ApiError(404, 'NOT_FOUND', message, { details });
  }

  static unauthorized(message = 'API key ausente o incorrecta.'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message, {
      hint: 'Envía la cabecera X-API-Key o el parámetro apikey.',
    });
  }

  static tooLarge(message: string, details?: unknown): ApiError {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message, { details });
  }

  static unsupportedMedia(message: string, details?: unknown): ApiError {
    return new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message, { details });
  }

  static rateLimited(message = 'Has superado el límite de peticiones.'): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message, {
      hint: 'Espera unos segundos o amplía RATE_LIMIT_MAX en el servidor.',
    });
  }

  static provider(message: string, details?: unknown, status = 502): ApiError {
    return new ApiError(status, 'PROVIDER_UNAVAILABLE', message, {
      details,
      hint: 'El proveedor externo no respondió. Vuelve a intentarlo en unos segundos.',
    });
  }

  static blocked(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'UPSTREAM_BLOCKED', message, {
      details,
      hint: 'Por seguridad solo se permiten destinos públicos de la web abierta.',
    });
  }

  static internal(message = 'Error interno del servidor.', details?: unknown): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message, { details });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
