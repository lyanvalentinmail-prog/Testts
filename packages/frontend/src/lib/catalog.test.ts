import { describe, expect, it } from 'vitest';
import { ENDPOINTS, FEATURED_ENDPOINTS } from '@velora/shared';
import { buildCodeSamples, formatBytes, formatMs, initialValues, requestUrl, resolveMethod } from './api';
import { RESPONSE_EXAMPLES, responseExample } from './examples';

describe('catálogo y ejemplos', () => {
  it('todo endpoint JSON tiene un ejemplo de respuesta', () => {
    const missing = ENDPOINTS.filter(
      (endpoint) => endpoint.output === 'json' && responseExample(endpoint.id) === null
    ).map((endpoint) => endpoint.id);
    expect(missing).toEqual([]);
  });

  it('los ejemplos no están vacíos', () => {
    for (const [id, example] of Object.entries(RESPONSE_EXAMPLES)) {
      expect(id).toMatch(/^[a-zA-Z]+\.[a-zA-Z0-9.]+$/);
      expect(example).toBeTypeOf('object');
      expect(example).not.toBeNull();
    }
  });

  it('hay endpoints destacados', () => {
    expect(FEATURED_ENDPOINTS.length).toBeGreaterThan(5);
  });
});

describe('constructores de peticiones', () => {
  it('inicializa valores con los defaults del catálogo', () => {
    const brat = ENDPOINTS.find((endpoint) => endpoint.id === 'canvas.brat')!;
    const values = initialValues(brat);
    expect(values.text).toBeTypeOf('string');
    expect(String(values.format)).toBe('png');
  });

  it('construye la URL con path params y query', () => {
    const notes = ENDPOINTS.find((endpoint) => endpoint.id === 'utils.notes.get')!;
    const url = requestUrl(notes, { id: 'abc-123' });
    expect(url).toBe('/api/utils/notes/abc-123');
  });

  it('usa POST cuando hay archivos y el endpoint lo permite', () => {
    const canvas = ENDPOINTS.find((endpoint) => endpoint.id === 'canvas.minions')!;
    expect(resolveMethod({ def: canvas, values: {} })).toBe('GET');
    const file = new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' });
    expect(resolveMethod({ def: canvas, values: {}, files: { image: file } })).toBe('POST');
  });

  it('genera ejemplos en cURL, JavaScript y Python', () => {
    const search = ENDPOINTS.find((endpoint) => endpoint.id === 'anime.search')!;
    const samples = buildCodeSamples(search, { q: 'naruto' });
    expect(samples.curl).toContain('curl');
    expect(samples.curl).toContain('/api/anime/search');
    expect(samples.javascript).toContain('fetch');
    expect(samples.python).toContain('requests.get');
  });

  it('formatea tamaños y tiempos', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatMs(500)).toBe('500 ms');
    expect(formatMs(1500)).toBe('1.50 s');
  });
});
