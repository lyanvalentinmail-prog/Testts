/**
 * Render de SVG a imagen.
 *
 * - `@resvg/resvg-js` (Rust, WASM/native) convierte el SVG en PNG sin depender
 *   de librsvg ni de fuentes del sistema: las fuentes DejaVu van incluidas.
 * - `sharp` recodifica a JPEG/WebP con control de calidad.
 * Ambas funcionan en Render y en Vercel (runtime Node x64).
 */
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { ApiError } from './errors.js';
import { fontFiles } from './assets.js';
import { stats } from './stats.js';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export interface RenderOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
  quality?: number;
  background?: string;
}

export interface RenderedImage {
  buffer: Buffer;
  mime: string;
  extension: string;
  width: number;
  height: number;
  format: ImageFormat;
}

let fontsRegistered: string[] | null = null;

function fonts(): string[] {
  if (!fontsRegistered) {
    fontsRegistered = fontFiles();
    if (fontsRegistered.length === 0) {
      // Sin fuentes incrustadas el SVG sigue renderizándose con la fuente por defecto.
      console.warn('[velora] aviso: no se encontraron fuentes en assets/fonts');
    }
  }
  return fontsRegistered;
}

/** Convierte un SVG en PNG con resvg. */
export function svgToPng(svg: string, options: { width?: number; height?: number; background?: string } = {}): Buffer {
  const width = Math.round(options.width ?? 0);
  const height = Math.round(options.height ?? 0);
  try {
    const resvg = new Resvg(svg, {
      fitTo: width ? { mode: 'width', value: width } : { mode: 'original' },
      font: {
        fontFiles: fonts(),
        loadSystemFonts: false,
        defaultFontFamily: 'DejaVu Sans',
      },
      ...(options.background ? { background: options.background } : {}),
    });
    const rendered = resvg.render();
    const png = rendered.asPng();
    if (height && width && Math.abs(rendered.height - height) > 4) {
      // fitTo respeta la proporción: si la altura pedida difiere, se escala con sharp.
      return png;
    }
    return Buffer.from(png);
  } catch (error) {
    throw ApiError.internal('No se pudo rasterizar el SVG generado.', {
      reason: (error as Error).message,
    });
  }
}

/** Renderiza un SVG al formato solicitado. */
export async function renderImage(svg: string, options: RenderOptions = {}): Promise<RenderedImage> {
  const format: ImageFormat = options.format ?? 'png';
  const width = Math.round(options.width ?? 0);
  const height = Math.round(options.height ?? 0);
  const quality = Math.min(100, Math.max(1, Math.round(options.quality ?? 90)));

  if (format === 'svg') {
    const size = svgSize(svg);
    return {
      buffer: Buffer.from(svg),
      mime: 'image/svg+xml; charset=utf-8',
      extension: 'svg',
      width: width || size.width,
      height: height || size.height,
      format,
    };
  }

  let png = svgToPng(svg, { ...(width ? { width } : {}), ...(options.background ? { background: options.background } : {}) });
  let outputWidth = width;
  let outputHeight = height;
  const size = svgSize(svg);

  if (width && height && (size.width !== width || size.height !== height)) {
    // El usuario pidió un tamaño distinto al del lienzo: se escala exactamente.
    png = await sharp(png).resize(width, height, { fit: 'fill' }).png().toBuffer();
  } else {
    const metadata = await sharp(png).metadata();
    outputWidth = metadata.width ?? width;
    outputHeight = metadata.height ?? height;
  }

  if (format === 'png') {
    stats.imageGenerated();
    return {
      buffer: png,
      mime: 'image/png',
      extension: 'png',
      width: outputWidth,
      height: outputHeight,
      format,
    };
  }

  const pipeline = sharp(png);
  const buffer =
    format === 'jpeg'
      ? await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
      : await pipeline.webp({ quality, effort: 4 }).toBuffer();

  stats.imageGenerated();
  return {
    buffer,
    mime: format === 'jpeg' ? 'image/jpeg' : 'image/webp',
    extension: format === 'jpeg' ? 'jpg' : 'webp',
    width: outputWidth,
    height: outputHeight,
    format,
  };
}

function svgSize(svg: string): { width: number; height: number } {
  const widthMatch = /width="(\d+(?:\.\d+)?)"/.exec(svg);
  const heightMatch = /height="(\d+(?:\.\d+)?)"/.exec(svg);
  return {
    width: widthMatch ? Math.round(Number(widthMatch[1])) : 512,
    height: heightMatch ? Math.round(Number(heightMatch[1])) : 512,
  };
}

/** Valida que un buffer sea realmente una imagen leyendo su firma. */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 4, 12).includes('ftypavif')) return 'image/avif';
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 200)).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
  if (buffer.length > 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) return 'image/bmp';
  return null;
}

/** Convierte una entrada (data URI o buffer) en data URI aceptado por resvg. */
export function toDataUri(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/** Normaliza cualquier imagen subida a un data URI seguro (JPEG/PNG/WebP). */
export async function normalizeUpload(buffer: Buffer, maxBytes: number): Promise<{ dataUri: string; mime: string; width: number; height: number }> {
  if (buffer.length > maxBytes) {
    throw ApiError.tooLarge(`La imagen supera el límite de ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`);
  }
  const mime = sniffImageMime(buffer);
  if (!mime) {
    throw ApiError.unsupportedMedia('El archivo no es una imagen reconocible (JPEG, PNG, WebP, GIF, AVIF o SVG).');
  }
  if (mime === 'image/svg+xml') {
    throw ApiError.unsupportedMedia('Los SVG subidos no se aceptan por seguridad (pueden incluir scripts).');
  }
  const metadata = await sharp(buffer).metadata();
  if ((metadata.width ?? 0) > 6000 || (metadata.height ?? 0) > 6000) {
    throw ApiError.badRequest('La imagen es demasiado grande (máximo 6000×6000 px).');
  }
  // Se normaliza a PNG para evitar perfiles de color y orientaciones exóticas.
  const normalized = await sharp(buffer).rotate().png({ compressionLevel: 9 }).toBuffer();
  return {
    dataUri: toDataUri(normalized, 'image/png'),
    mime: 'image/png',
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}
