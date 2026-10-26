/**
 * Acceso a los recursos empaquetados (plantillas de canvas, fuentes, fotos).
 *
 * En Vercel la carpeta `assets/` se incluye con `includeFiles`, así que se lee
 * en tiempo de ejecución (solo lectura). Aquí se buscan varias rutas candidatas
 * para que funcione igual en local, en Render y dentro de la función serverless.
 */
import { existsSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { ApiError } from './errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  config.assetsDir,
  process.env.ASSETS_DIR ?? '',
  path.resolve(process.cwd(), 'packages/backend/assets'),
  path.resolve(process.cwd(), 'assets'),
  path.resolve(here, '../../assets'),
  path.resolve(here, '../assets'),
  path.resolve(here, '../../../backend/assets'),
  path.resolve(here, '../../../../packages/backend/assets'),
].filter(Boolean);

let cachedRoot: string | null = null;

/** Ruta absoluta de la carpeta de assets (detectada una sola vez). */
export function assetsDir(): string {
  if (cachedRoot) return cachedRoot;
  for (const candidate of CANDIDATES) {
    try {
      if (existsSync(path.join(candidate, 'canvas', 'brat.jpg'))) {
        cachedRoot = candidate;
        return candidate;
      }
    } catch {
      /* siguiente candidato */
    }
  }
  throw ApiError.internal('No se encontró la carpeta de assets del backend.', {
    probados: CANDIDATES,
    pista: 'Define ASSETS_DIR con la ruta absoluta a packages/backend/assets.',
  });
}

export interface TemplateAsset {
  key: string;
  file: string;
  mime: string;
  width: number;
  height: number;
  dataUri: string;
}

const templateCache = new Map<string, TemplateAsset>();

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
};

/** Lee las dimensiones sin dependencias externas (JPEG, PNG, WebP). */
export function imageSize(buffer: Buffer, ext: string): { width: number; height: number } {
  if (ext === '.png' && buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (ext === '.webp' && buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const format = buffer.toString('ascii', 12, 16);
    if (format === 'VP8X') {
      return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    }
    if (format === 'VP8 ') {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    }
  }
  // JPEG: buscar marcador SOF
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1] as number;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) break;
    offset += 2 + length;
  }
  return { width: 736, height: 736 };
}

/** Carga una plantilla de canvas como data URI (cacheada en memoria). */
export async function loadTemplate(key: string, preferredExt = 'jpg'): Promise<TemplateAsset> {
  const cached = templateCache.get(key);
  if (cached) return cached;

  for (const ext of [preferredExt, 'jpg', 'jpeg', 'png', 'webp', 'svg']) {
    const file = path.join(assetsDir(), 'canvas', `${key}.${ext}`);
    try {
      const buffer = await readFile(file);
      const mime = MIME_BY_EXT[`.${ext}`] ?? 'application/octet-stream';
      const { width, height } = imageSize(buffer, `.${ext}`);
      const asset: TemplateAsset = {
        key,
        file,
        mime,
        width,
        height,
        dataUri: `data:${mime};base64,${buffer.toString('base64')}`,
      };
      templateCache.set(key, asset);
      return asset;
    } catch {
      /* probamos la siguiente extensión */
    }
  }

  throw ApiError.internal(`No se encontró la plantilla «${key}» en assets/canvas.`, {
    disponible: await listTemplates(),
  });
}

export async function listTemplates(): Promise<string[]> {
  try {
    const files = await readdir(path.join(assetsDir(), 'canvas'));
    return files.map((file) => file.replace(/\.[^.]+$/, '')).sort();
  } catch {
    return [];
  }
}

/** Ruta local de una plantilla (para servir la vista previa original). */
export async function templateFilePath(key: string): Promise<{ file: string; mime: string } | null> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const file = path.join(assetsDir(), 'canvas', `${key}.${ext}`);
    try {
      const info = await stat(file);
      if (info.isFile()) return { file, mime: MIME_BY_EXT[`.${ext}`] ?? 'image/jpeg' };
    } catch {
      /* siguiente */
    }
  }
  return null;
}

let fontsCache: string[] | null = null;

/** Archivos de fuente incluidos (render determinista en cualquier plataforma). */
export function fontFiles(): string[] {
  if (fontsCache) return fontsCache;
  const dir = path.join(assetsDir(), 'fonts');
  const names = [
    'DejaVuSans.ttf',
    'DejaVuSans-Bold.ttf',
    'DejaVuSansMono.ttf',
    'DejaVuSansMono-Bold.ttf',
  ];
  fontsCache = names.map((name) => path.join(dir, name)).filter((file) => existsSync(file));
  return fontsCache;
}

export const DEFAULT_AVATARS = {
  boy: 'defaults/avatar-boy.jpg',
  girl: 'defaults/avatar-girl.jpg',
} as const;

const avatarCache = new Map<string, string>();

/** Data URI del avatar por defecto incluido en el proyecto. */
export async function defaultAvatar(kind: 'boy' | 'girl' = 'boy'): Promise<string> {
  const cached = avatarCache.get(kind);
  if (cached) return cached;
  const file = path.join(assetsDir(), DEFAULT_AVATARS[kind]);
  const buffer = await readFile(file);
  const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
  avatarCache.set(kind, dataUri);
  return dataUri;
}

/** Registro de fotos incluidas, con metadatos legibles. */
export interface PhotoEntry {
  id: string;
  file: string;
  album: string;
  title: string;
  description: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
  url: string;
}

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

function prettify(name: string): string {
  return name
    .replace(/^\d+[-_ ]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

let photosCache: PhotoEntry[] | null = null;

export async function listPhotos(): Promise<PhotoEntry[]> {
  if (photosCache) return photosCache;
  const root = path.join(assetsDir(), 'photos');
  let metadata: Record<string, { titulo?: string; descripcion?: string; etiquetas?: string[]; album?: string }> = {};
  try {
    metadata = JSON.parse(await readFile(path.join(root, 'info.json'), 'utf8'));
  } catch {
    metadata = {};
  }

  const entries: PhotoEntry[] = [];
  const walk = async (dir: string, prefix: string): Promise<void> => {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      return;
    }
    for (const file of files.sort()) {
      const full = path.join(dir, file);
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full, prefix ? `${prefix}/${file}` : file);
        continue;
      }
      const ext = path.extname(file).toLowerCase();
      if (!PHOTO_EXTENSIONS.has(ext)) continue;
      const id = path.basename(prefix ? `${prefix}/${file}` : file, ext);
      const meta = metadata[prefix ? `${prefix}/${file}` : file] ?? {};
      const buffer = await readFile(full);
      const { width, height } = imageSize(buffer, ext);
      const album = meta.album ?? (prefix ? prettify(prefix.split('/').pop() as string) : 'General');
      entries.push({
        id,
        file: path.relative(root, full).split(path.sep).join('/'),
        album,
        title: meta.titulo ?? prettify(path.basename(file, ext)),
        description: meta.descripcion ?? null,
        tags: meta.etiquetas ?? [],
        width: width || null,
        height: height || null,
        url: `/api/download/photo/${encodeURIComponent(id)}`,
      });
    }
  };

  await walk(root, '');
  photosCache = entries;
  return entries;
}

export async function photoPath(id: string): Promise<string | null> {
  const photos = await listPhotos();
  const photo = photos.find((entry) => entry.id === id || entry.file === id);
  if (!photo) return null;
  const root = path.join(assetsDir(), 'photos');
  const resolved = path.resolve(root, photo.file);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}
