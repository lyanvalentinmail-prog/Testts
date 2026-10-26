import type { ParamDef, ParamValue } from '../types.js';

export interface ValidationError {
  parameter: string;
  message: string;
  received?: unknown;
}

export interface ValidationResult {
  values: Record<string, ParamValue>;
  errors: ValidationError[];
}

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|rgba?\([^)]{1,40}\)|hsla?\([^)]{1,40}\)|transparent)$/;

/** Convierte un valor de query string al tipo declarado por el parámetro. */
export function coerce(param: ParamDef, raw: unknown): { value?: ParamValue; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    if (param.required) return { error: 'es obligatorio' };
    return { value: param.default };
  }
  const asText = String(raw).trim();

  switch (param.type) {
    case 'integer':
    case 'number': {
      const number = Number(asText);
      if (!Number.isFinite(number)) return { error: 'debe ser un número' };
      if (param.type === 'integer' && !Number.isInteger(number)) return { error: 'debe ser un número entero' };
      if (param.minimum !== undefined && number < param.minimum) {
        return { error: `debe ser mayor o igual que ${param.minimum}` };
      }
      if (param.maximum !== undefined && number > param.maximum) {
        return { error: `debe ser menor o igual que ${param.maximum}` };
      }
      return { value: number };
    }
    case 'boolean': {
      const normalized = asText.toLowerCase();
      if (['1', 'true', 'si', 'sí', 'yes', 'on'].includes(normalized)) return { value: true };
      if (['0', 'false', 'no', 'off'].includes(normalized)) return { value: false };
      return { error: 'debe ser true o false' };
    }
    case 'enum': {
      const allowed = param.enumValues ?? [];
      if (!allowed.includes(asText)) {
        return { error: `debe ser uno de: ${allowed.join(', ')}` };
      }
      return { value: asText };
    }
    case 'color': {
      if (!COLOR_RE.test(asText)) return { error: 'debe ser un color en hexadecimal, rgb() o un nombre CSS' };
      return { value: asText };
    }
    case 'url': {
      try {
        const url = new URL(asText);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'solo se admite http o https' };
        return { value: url.toString() };
      } catch {
        return { error: 'debe ser una URL absoluta válida' };
      }
    }
    case 'image': {
      if (asText.startsWith('data:image/')) {
        if (asText.length > 8_000_000) return { error: 'la imagen en base64 supera los 8 MB' };
        return { value: asText };
      }
      try {
        const url = new URL(asText);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return { error: 'solo se admite http o https' };
        return { value: url.toString() };
      } catch {
        return { error: 'debe ser una URL http(s) o un data URI de imagen' };
      }
    }
    default: {
      if (param.minLength !== undefined && asText.length < param.minLength) {
        return { error: `debe tener al menos ${param.minLength} caracteres` };
      }
      if (param.maxLength !== undefined && asText.length > param.maxLength) {
        return { error: `no puede superar los ${param.maxLength} caracteres` };
      }
      if (param.pattern && !new RegExp(param.pattern).test(asText)) {
        return { error: 'no cumple el formato esperado' };
      }
      return { value: asText };
    }
  }
}

/**
 * Valida y normaliza los parámetros de un endpoint.
 * `input` debe contener los valores tal y como llegan del cliente (string o ya tipados).
 */
export function validateParams(params: ParamDef[], input: Record<string, unknown>): ValidationResult {
  const values: Record<string, ParamValue> = {};
  const errors: ValidationError[] = [];

  for (const param of params) {
    if (param.in === 'path') continue;
    // Acepta el nombre canónico y, si no viene, el primero de sus alias.
    let raw = input[param.name];
    if (raw === undefined && param.aliases) {
      for (const alias of param.aliases) {
        if (input[alias] !== undefined) {
          raw = input[alias];
          break;
        }
      }
    }
    const { value, error } = coerce(param, raw);
    if (error) {
      errors.push({ parameter: param.name, message: error, received: raw ?? null });
      continue;
    }
    if (value !== undefined && value !== '') values[param.name] = value;
  }

  return { values, errors };
}

/** Lee un parámetro aceptando sus alias (por ejemplo `q`, `query`, `buscar`). */
export function readAliased(params: ParamDef[], query: Record<string, unknown>, name: string): unknown {
  const def = params.find((p) => p.name === name);
  if (def && query[name] !== undefined) return query[name];
  if (def?.aliases) {
    for (const alias of def.aliases) {
      if (query[alias] !== undefined) return query[alias];
    }
  }
  return undefined;
}

/** Sustituye los `{param}` de una ruta por sus valores. */
export function buildPath(template: string, values: Record<string, ParamValue>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => {
    const value = values[name];
    return encodeURIComponent(value === undefined ? '' : String(value));
  });
}

/** Construye la query string con los parámetros de tipo query. */
export function buildQuery(params: ParamDef[], values: Record<string, ParamValue>): string {
  const search = new URLSearchParams();
  for (const param of params) {
    if (param.in !== 'query') continue;
    const value = values[param.name];
    if (value === undefined || value === '' || value === param.default) continue;
    search.set(param.name, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** Construye la ruta final (path + query) para una petición. */
export function buildRequestUrl(
  def: { path: string; params: ParamDef[] },
  values: Record<string, ParamValue>
): string {
  return `${buildPath(def.path, values)}${buildQuery(def.params, values)}`;
}
