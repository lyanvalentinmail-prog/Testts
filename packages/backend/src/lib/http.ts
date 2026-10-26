/**
 * Cliente HTTP saliente con límites y protección SSRF.
 *
 * - Tiempo máximo configurable (`HTTP_TIMEOUT_MS`).
 * - Tamaño máximo de respuesta (`HTTP_MAX_BYTES`), se corta la descarga.
 * - Redirecciones manuales (máx. 3) validadas una a una con `assertPublicUrl`.
 * - Todo error de red se traduce a un ApiError 502 con contexto.
 */
import { config } from '../config.js';
import { ApiError } from './errors.js';
import { stats } from './stats.js';
import { assertPublicUrl } from './net-guard.js';

export interface SafeFetchOptions {
  method?: 'GET' | 'HEAD' | 'POST';
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  accept?: string;
  signal?: AbortSignal;
}

export interface SafeResponse {
  status: number;
  ok: boolean;
  url: string;
  headers: Headers;
  contentType: string;
  buffer: Buffer;
  truncated: boolean;
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

export async function safeFetch(input: string, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const timeoutMs = options.timeoutMs ?? config.http.timeoutMs;
  const maxBytes = options.maxBytes ?? config.http.maxBytes;
  const maxRedirects = options.maxRedirects ?? config.http.maxRedirects;

  let currentUrl = await assertPublicUrl(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      stats.providerCall();
      let response: Response;
      try {
        response = await fetch(currentUrl, {
          method: options.method ?? 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'user-agent': config.http.userAgent,
            accept: options.accept ?? 'text/html,application/json;q=0.9,*/*;q=0.8',
            'accept-encoding': 'identity',
            ...(options.headers ?? {}),
          },
        });
      } catch (error) {
        stats.providerFailure();
        const aborted = (error as Error)?.name === 'AbortError';
        throw ApiError.provider(
          aborted
            ? `El servidor remoto no respondió en ${Math.round(timeoutMs / 1000)} s.`
            : 'No se pudo conectar con el servidor remoto.',
          { url: currentUrl.toString(), reason: (error as Error)?.message }
        );
      }

      if (REDIRECT_CODES.has(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw ApiError.provider('El servidor remoto devolvió una redirección sin destino.', { status: response.status });
        if (redirects === maxRedirects) {
          throw ApiError.provider('Demasiadas redirecciones al acceder al recurso.', { maxRedirects });
        }
        const next = new URL(location, currentUrl).toString();
        currentUrl = await assertPublicUrl(next, 'redirección');
        continue;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const declaredLength = Number(response.headers.get('content-length') ?? '0');
      if (declaredLength > maxBytes) {
        throw ApiError.tooLarge(
          `El recurso remoto pesa ${(declaredLength / 1024 / 1024).toFixed(2)} MB y el máximo es ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`,
          { declaredLength, maxBytes }
        );
      }

      const buffer = await readLimited(response, maxBytes, currentUrl.toString());
      return {
        status: response.status,
        ok: response.ok,
        url: currentUrl.toString(),
        headers: response.headers,
        contentType,
        buffer: buffer.data,
        truncated: buffer.truncated,
      };
    }

    throw ApiError.provider('Demasiadas redirecciones al acceder al recurso.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

async function readLimited(response: Response, maxBytes: number, url: string): Promise<{ data: Buffer; truncated: boolean }> {
  if (!response.body) return { data: Buffer.alloc(0), truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      truncated = true;
      await reader.cancel().catch(() => undefined);
      throw ApiError.tooLarge(
        `La respuesta de ${new URL(url).host} supera el límite de ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`,
        { maxBytes }
      );
    }
    chunks.push(value);
  }

  return { data: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))), truncated };
}

export async function fetchJson<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<{ data: T; status: number; headers: Headers }> {
  const response = await safeFetch(url, { accept: 'application/json', ...options });
  if (!response.ok) {
    throw ApiError.provider(`El proveedor respondió ${response.status}.`, {
      url,
      status: response.status,
      body: response.buffer.toString('utf8').slice(0, 300),
    });
  }
  try {
    return { data: JSON.parse(response.buffer.toString('utf8')) as T, status: response.status, headers: response.headers };
  } catch {
    throw ApiError.provider('El proveedor devolvió una respuesta que no es JSON válido.', { url });
  }
}

export async function fetchText(
  url: string,
  options: SafeFetchOptions = {}
): Promise<{ text: string; status: number; headers: Headers; url: string }> {
  const response = await safeFetch(url, { accept: 'text/html,text/plain;q=0.9,*/*;q=0.8', ...options });
  return {
    text: response.buffer.toString('utf8'),
    status: response.status,
    headers: response.headers,
    url: response.url,
  };
}
