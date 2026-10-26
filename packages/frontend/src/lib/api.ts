import {
  buildQuery,
  buildRequestUrl,
  type EndpointDef,
  type HttpMethod,
  type ParamValue,
} from '@velora/shared';

/** Base de la API. En producción el frontend y la API comparten origen. */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export function absoluteUrl(pathAndQuery: string): string {
  if (/^https?:\/\//i.test(pathAndQuery)) return pathAndQuery;
  const origin = API_BASE || (typeof window === 'undefined' ? '' : window.location.origin);
  return `${origin}${pathAndQuery}`;
}

export type ParamValues = Record<string, ParamValue>;

export interface RunRequest {
  def: EndpointDef;
  values: ParamValues;
  files?: Record<string, File>;
  /** Cuerpo JSON literal (para endpoints con requestBody sin parámetros de cuerpo). */
  rawBody?: string;
  method?: HttpMethod | 'AUTO';
}

export interface RunResult {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  contentType: string;
  headers: Record<string, string>;
  json?: unknown;
  text?: string;
  blob?: Blob;
  objectUrl?: string;
  size: number;
  requestUrl: string;
  requestMethod: string;
  error?: string;
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export function isImageContentType(contentType: string): boolean {
  return IMAGE_TYPES.some((type) => contentType.includes(type));
}

export function isVideoContentType(contentType: string): boolean {
  return VIDEO_TYPES.some((type) => contentType.includes(type));
}

/** Elige el método real de la petición: POST/multipart cuando hay archivos. */
export function resolveMethod(request: RunRequest): HttpMethod {
  const { def, files, method } = request;
  if (method && method !== 'AUTO') return method;
  const hasFiles = files && Object.keys(files).length > 0;
  if (!hasFiles) return def.method;
  return def.altMethods?.includes('POST') ? 'POST' : def.method;
}

function hasBodyParams(def: EndpointDef): boolean {
  return def.params.some((param) => param.in === 'body');
}

function pickBodyValues(def: EndpointDef, values: ParamValues): Record<string, ParamValue> {
  return Object.fromEntries(
    def.params.filter((param) => param.in === 'body' && values[param.name] !== undefined).map((param) => [param.name, values[param.name] as ParamValue])
  );
}

/** URL final que se enviará al servidor (path + query, sin parámetros de cuerpo). */
export function requestUrl(def: EndpointDef, values: ParamValues): string {
  return buildRequestUrl(def, values);
}

/** Ejecuta un endpoint real y normaliza la respuesta para la interfaz. */
export async function runEndpoint(request: RunRequest): Promise<RunResult> {
  const { def, values, files = {}, rawBody } = request;
  const method = resolveMethod(request);
  const pathAndQuery = buildRequestUrl(def, values);
  const url = absoluteUrl(pathAndQuery);
  const started = performance.now();
  const headers: Record<string, string> = { Accept: '*/*' };

  const init: RequestInit = { method, headers };
  const fileEntries = Object.entries(files).filter(([, file]) => file && file.size > 0);

  if (method === 'POST' || method === 'PUT') {
    if (fileEntries.length > 0) {
      const form = new FormData();
      for (const [name, file] of fileEntries) form.append(name, file, file.name);
      for (const [name, value] of Object.entries(values)) {
        if (value !== undefined && value !== '' && !files[name]) form.append(name, String(value));
      }
      init.body = form;
      delete headers['Content-Type'];
    } else if (rawBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = rawBody;
    } else if (hasBodyParams(def)) {
      const body = pickBodyValues(def, values);
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else {
      const form = new FormData();
      for (const [name, value] of Object.entries(values)) {
        if (value !== undefined && value !== '') form.append(name, String(value));
      }
      init.body = form;
      delete headers['Content-Type'];
    }
  }

  try {
    const response = await fetch(url, init);
    const durationMs = Math.round(performance.now() - started);
    const contentType = response.headers.get('content-type') ?? '';
    const result: RunResult = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
      size: 0,
      requestUrl: url,
      requestMethod: method,
    };

    if (isImageContentType(contentType) || isVideoContentType(contentType) || contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
      const blob = await response.blob();
      result.blob = blob;
      result.size = blob.size;
      result.objectUrl = URL.createObjectURL(blob);
      return result;
    }

    const text = await response.text();
    result.text = text;
    result.size = new Blob([text]).size;
    if (contentType.includes('json')) {
      try {
        result.json = JSON.parse(text);
      } catch {
        result.json = undefined;
      }
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Error de red',
      durationMs: Math.round(performance.now() - started),
      contentType: '',
      headers: {},
      size: 0,
      requestUrl: url,
      requestMethod: method,
      error:
        error instanceof Error
          ? `${error.message}. Comprueba que la API esté en marcha y que la URL sea correcta.`
          : 'No se pudo completar la petición.',
    };
  }
}

/* --------------------------------- Helpers -------------------------------- */

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${units[index]}`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Valores iniciales de un formulario: default → example → valor vacío. */
export function initialValues(def: EndpointDef): ParamValues {
  const values: ParamValues = {};
  for (const param of def.params) {
    if (param.in === 'body') {
      if (param.default !== undefined) values[param.name] = param.default;
      continue;
    }
    if (param.default !== undefined) values[param.name] = param.default;
    else if (param.example !== undefined) values[param.name] = param.example;
    else if (param.type === 'boolean') values[param.name] = false;
  }
  return values;
}

/* ----------------------------- Código de ejemplo ---------------------------- */

export interface CodeSamples {
  curl: string;
  javascript: string;
  python: string;
}

function quote(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

export function buildCodeSamples(
  def: EndpointDef,
  values: ParamValues,
  files: Record<string, File> = {},
  rawBody?: string
): CodeSamples {
  const method = resolveMethod({ def, values, files });
  const url = absoluteUrl(buildRequestUrl(def, values));
  const queryParams = def.params.filter((p) => p.in === 'query' && values[p.name] !== undefined && values[p.name] !== '');
  const bodyParams = def.params.filter((p) => p.in === 'body' && values[p.name] !== undefined);
  const fileEntries = Object.entries(files).filter(([, f]) => f && f.size > 0);
  const isMultipart = fileEntries.length > 0;
  const jsonBody = method === 'POST' && bodyParams.length > 0 && !isMultipart;
  const rawJsonBody = method === 'POST' && rawBody !== undefined && !isMultipart && !jsonBody;

  const curlParts = [`curl --request ${method} \\`, `  --url ${quote(url)}`];
  if (jsonBody) {
    const body = JSON.stringify(
      Object.fromEntries(bodyParams.map((p) => [p.name, values[p.name]])),
      null,
      2
    );
    curlParts.push(`  --header 'Content-Type: application/json' \\`, `  --data '${body}'`);
  } else if (rawJsonBody) {
    curlParts.push(
      `  --header 'Content-Type: application/json' \\`,
      `  --data '${rawBody.replace(/'/g, "\\'")}'`
    );
  }
  if (isMultipart) {
    for (const [name, file] of fileEntries) curlParts.push(`  --form ${quote(`${name}=@${file.name}`)} \\`);
  }

  const jsLines = [
    'const response = await fetch(',
    `  ${quote(url)},`,
    '  {',
    `    method: ${quote(method)},`,
  ];
  if (jsonBody) {
    jsLines.push("    headers: { 'Content-Type': 'application/json' },");
    jsLines.push(
      `    body: JSON.stringify(${JSON.stringify(Object.fromEntries(bodyParams.map((p) => [p.name, values[p.name]])), null, 2).replace(/\n/g, '\n    ')})`
    );
  } else if (rawJsonBody) {
    jsLines.push("    headers: { 'Content-Type': 'application/json' },");
    jsLines.push(`    body: ${JSON.stringify(rawBody)},`);
  }
  if (isMultipart) {
    jsLines.push('    body: (() => {', '      const form = new FormData();');
    for (const [name, file] of fileEntries) jsLines.push(`      form.append(${quote(name)}, fileInput${name === 'image' ? '' : '2'}.files[0]);`);
    jsLines.push('      return form;', '    })(),');
  }
  jsLines.push('  }', ');', '', 'const data = await response.json();', 'console.log(data);');

  const pythonLines = [
    'import json',
    'import requests',
    '',
    `url = ${JSON.stringify(url)}`,
  ];
  if (jsonBody) {
    pythonLines.push(
      'payload = {',
      ...bodyParams.map((p) => `    ${JSON.stringify(p.name)}: ${JSON.stringify(values[p.name])},`),
      '}',
      `response = requests.${method.toLowerCase()}(url, json=payload, timeout=30)`
    );
  } else if (rawJsonBody) {
    pythonLines.push(
      'payload = json.loads(' + JSON.stringify(rawBody) + ')',
      `response = requests.${method.toLowerCase()}(url, json=payload, timeout=30)`
    );
  } else if (isMultipart) {
    pythonLines.push(
      'files = {',
      ...fileEntries.map(([name, file]) => `    ${JSON.stringify(name)}: open(${JSON.stringify(file.name)}, "rb"),`),
      '}',
      `response = requests.${method.toLowerCase()}(url, files=files, timeout=30)`
    );
  } else {
    pythonLines.push(`response = requests.${method.toLowerCase()}(url, timeout=30)`);
  }
  pythonLines.push('print(response.status_code)', 'print(response.json())');

  return {
    curl: curlParts.join('\n'),
    javascript: jsLines.join('\n'),
    python: pythonLines.join('\n'),
  };
}

/** Cambia el método documentado por su variante POST y viceversa. */
export function methodLabel(method: string): string {
  return method.toUpperCase();
}

export { buildQuery };
