import { readFile } from 'node:fs/promises';
import { Router } from 'express';
import { validatePath, validateQuery } from '../middleware/validate.js';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { ApiError } from '../lib/errors.js';
import { listPhotos, photoPath } from '../lib/assets.js';
import { fetchJson, safeFetch } from '../lib/http.js';
import { sniffImageMime } from '../lib/image.js';
import { binary, ok, text } from '../lib/respond.js';
import { cleanText, escapeXml, safeFilename } from '../lib/text.js';
import { lrclib } from '../services/providers.js';

export const downloadRouter = Router();

const ALLOWED_FILE_TYPES = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/pdf',
  'application/zip',
  'application/xml',
  'text/xml',
  'application/octet-stream',
]);

downloadRouter.get('/image', validateQuery('download.image'), async (req, res) => {
  const url = String(req.query_.url ?? '');
  const filename = typeof req.query_.filename === 'string' ? req.query_.filename : '';
  const download = req.query_.download !== false;

  const response = await safeFetch(url, { maxBytes: 8 * 1024 * 1024, accept: 'image/*' });
  if (!response.ok) {
    throw ApiError.provider(`El servidor remoto respondió ${response.status} al pedir la imagen.`, {
      url,
      status: response.status,
    });
  }

  const mime = sniffImageMime(response.buffer);
  if (!mime) {
    throw ApiError.unsupportedMedia('El contenido descargado no es una imagen reconocible.', {
      contentType: response.contentType,
      bytes: response.buffer.length,
    });
  }
  if (mime === 'image/svg+xml') {
    // Los SVG pueden contener scripts: se sirven como descarga y con CSP estricta.
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
  }

  const extension = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  return binary(res, response.buffer, mime, {
    filename: filename ? `${filename}.${extension}` : `velora-imagen.${extension}`,
    download,
    cacheSeconds: 600,
  });
});

downloadRouter.get('/file', validateQuery('download.file'), async (req, res) => {
  const url = String(req.query_.url ?? '');
  const maxSizeMb = Math.min(25, Math.max(1, Number(req.query_.maxSize ?? 10)));
  const filename = typeof req.query_.filename === 'string' ? req.query_.filename : '';

  const response = await safeFetch(url, { maxBytes: maxSizeMb * 1024 * 1024, accept: '*/*' });
  if (!response.ok) {
    throw ApiError.provider(`El servidor remoto respondió ${response.status}.`, { url, status: response.status });
  }

  const contentType = (response.contentType || 'application/octet-stream').split(';')[0]?.trim() ?? 'application/octet-stream';
  const imageMime = sniffImageMime(response.buffer);
  if (!ALLOWED_FILE_TYPES.has(contentType) && !imageMime) {
    throw ApiError.unsupportedMedia(`El tipo de contenido «${contentType}» no está permitido.`, {
      permitidos: [...ALLOWED_FILE_TYPES, 'image/*'],
    });
  }

  const name = filename || url.split('/').pop()?.split('?')[0] || 'archivo';
  return binary(res, response.buffer, imageMime ?? contentType, {
    filename: safeFilename(name, 'archivo') + guessExtension(contentType, name),
    download: true,
    cacheSeconds: 0,
  });
});

function guessExtension(contentType: string, original: string): string {
  if (/\.[a-z0-9]{1,5}$/i.test(original)) return '';
  const map: Record<string, string> = {
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/xml': '.xml',
    'text/xml': '.xml',
  };
  return map[contentType] ?? '.bin';
}

downloadRouter.get('/lyrics', validateQuery('download.lyrics'), async (req, res) => {
  const artist = String(req.query_.artist ?? '');
  const track = String(req.query_.track ?? '');
  const format = String(req.query_.format ?? 'json');
  const result = await lrclib.get({ artist, track });

  if (format === 'lrc') {
    if (!result.syncedLyrics) {
      throw ApiError.notFound('LRCLIB no tiene letra sincronizada (LRC) para esta canción.', { artist, track });
    }
    return text(res, result.syncedLyrics, {
      headers: {
        'Content-Disposition': `attachment; filename="${safeFilename(`${artist}-${track}`)}.lrc"`,
      },
    });
  }
  if (format === 'txt') {
    return text(res, result.lyrics, {
      headers: { 'Content-Disposition': `attachment; filename="${safeFilename(`${artist}-${track}`)}.txt"` },
    });
  }
  return ok(res, result, { cached: result.cached });
});

downloadRouter.get('/qr', validateQuery('download.qr'), async (req, res) => {
  const data = cleanText(req.query_.data ?? '', 900);
  if (!data) throw ApiError.badRequest('El parámetro `data` no puede estar vacío.');
  const size = Math.min(1024, Math.max(64, Number(req.query_.size ?? 320)));
  const margin = Math.min(10, Math.max(0, Number(req.query_.margin ?? 2)));
  const dark = String(req.query_.dark ?? '#0b0f19');
  const light = String(req.query_.light ?? '#ffffff');
  const levelRaw = String(req.query_.level ?? 'M').toUpperCase();
  const level = (['L', 'M', 'Q', 'H'].includes(levelRaw) ? levelRaw : 'M') as 'L' | 'M' | 'Q' | 'H';
  const format = String(req.query_.format ?? 'png') === 'svg' ? 'svg' : 'png';

  if (format === 'svg') {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: level,
      margin,
      color: { dark: escapeXml(dark), light: escapeXml(light) },
    });
    return binary(res, Buffer.from(svg), 'image/svg+xml; charset=utf-8', {
      filename: 'velora-qr.svg',
      cacheSeconds: 86400,
    });
  }

  const buffer = await QRCode.toBuffer(data, {
    type: 'png',
    width: size,
    errorCorrectionLevel: level,
    margin,
    color: { dark, light: light === 'transparent' ? '#00000000' : light },
  });

  return binary(res, buffer, 'image/png', { filename: 'velora-qr.png', cacheSeconds: 86400 });
});

downloadRouter.get('/metadata', validateQuery('download.metadata'), async (req, res) => {
  const url = String(req.query_.url ?? '');
  const response = await safeFetch(url, { maxBytes: 2 * 1024 * 1024, accept: 'text/html,application/xhtml+xml' });
  if (!response.ok) {
    throw ApiError.provider(`El destino respondió ${response.status}.`, { url, status: response.status });
  }
  const contentType = response.contentType.toLowerCase();
  if (!contentType.includes('html') && !contentType.includes('xml')) {
    throw ApiError.unsupportedMedia(`El destino devolvió «${response.contentType || 'desconocido'}» y no HTML.`);
  }

  const html = response.buffer.toString('utf8');
  const base = new URL(response.url);
  const meta = new Map<string, string>();
  const metaRegex = /<meta\s+[^>]*>/gi;
  for (const tag of html.match(metaRegex) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (key && content !== undefined && !meta.has(key.toLowerCase())) meta.set(key.toLowerCase(), decodeHtml(content));
  }

  const title = decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? '');
  const iconHref = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1];
  const canonical = /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)?.[1];

  const absolute = (value: string | undefined): string | null => {
    if (!value) return null;
    try {
      return new URL(value, base).toString();
    } catch {
      return null;
    }
  };

  ok(res, {
    url: response.url,
    status: response.status,
    contentType: response.contentType,
    title: title || meta.get('og:title') || null,
    description: meta.get('description') ?? meta.get('og:description') ?? null,
    canonical: absolute(canonical),
    favicon: absolute(iconHref) ?? absolute('/favicon.ico'),
    openGraph: Object.fromEntries([...meta.entries()].filter(([key]) => key.startsWith('og:'))),
    twitter: Object.fromEntries([...meta.entries()].filter(([key]) => key.startsWith('twitter:'))),
    language: /<html[^>]+lang=["']([^"']+)["']/i.exec(html)?.[1] ?? null,
    images: [...meta.entries()].filter(([key]) => key === 'og:image' || key === 'twitter:image').map(([, value]) => absolute(value)).filter(Boolean),
  });
});

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)));
}

downloadRouter.get('/gallery', validateQuery('download.gallery'), async (req, res) => {
  const album = typeof req.query_.album === 'string' ? req.query_.album : '';
  const limit = Number(req.query_.limit ?? 20);
  const photos = await listPhotos();
  const filtered = photos.filter((photo) => !album || photo.album.toLowerCase() === album.toLowerCase());
  ok(res, {
    total: filtered.length,
    albums: [...new Set(photos.map((photo) => photo.album))],
    photos: filtered.slice(0, limit),
  });
});

downloadRouter.get('/photo/:id', validatePath('download.photo'), validateQuery('download.photo'), async (req, res) => {
  const id = decodeURIComponent(req.params.id as string);
  const file = await photoPath(id);
  if (!file) throw ApiError.notFound(`No existe la foto «${id}».`, { pista: 'Consulta /api/download/gallery' });

  const width = Math.min(2048, Math.max(64, Number(req.query.width ?? 800)));
  const format = String(req.query.format ?? 'jpeg').toLowerCase();
  const quality = Math.min(100, Math.max(1, Number(req.query.quality ?? 82)));

  const pipeline = sharp(await readFile(file)).rotate().resize({ width, withoutEnlargement: true });
  let buffer: Buffer;
  let mime: string;
  let extension: string;

  if (format === 'png') {
    buffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    mime = 'image/png';
    extension = 'png';
  } else if (format === 'webp') {
    buffer = await pipeline.webp({ quality }).toBuffer();
    mime = 'image/webp';
    extension = 'webp';
  } else {
    buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    mime = 'image/jpeg';
    extension = 'jpg';
  }

  return binary(res, buffer, mime, {
    filename: `velora-${safeFilename(id)}.${extension}`,
    cacheSeconds: 604800,
  });
});

/** Estado de los proveedores usados por las descargas. */
downloadRouter.get('/providers', validateQuery('download.providers'), async (_req, res) => {
  const checks: Array<{ name: string; url: string; ok: boolean; detail: string }> = [];

  const probe = async (name: string, url: string) => {
    try {
      const { status } = await fetchJson<unknown>(url, { timeoutMs: 4000, maxBytes: 64 * 1024 });
      checks.push({ name, url, ok: status < 400, detail: `HTTP ${status}` });
    } catch (error) {
      checks.push({ name, url, ok: false, detail: error instanceof Error ? error.message.slice(0, 120) : 'error' });
    }
  };

  await Promise.all([
    probe('lrclib', 'https://lrclib.net/api/search?q=hello'),
    probe('wikipedia', 'https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=api&format=json&srlimit=1'),
  ]);

  ok(res, { providers: checks, checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
});
