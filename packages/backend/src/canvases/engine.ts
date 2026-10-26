/**
 * Motor de composición de canvas.
 *
 * Cada plantilla original (assets/canvas) se usa como fondo del SVG y las zonas
 * declaradas en el catálogo cubren el contenido de ejemplo con el texto o la
 * imagen que llega por parámetros. El SVG se dibuja en el sistema de
 * coordenadas de la plantilla y resvg lo escala al tamaño de salida, así que
 * las coordenadas relativas funcionan con cualquier ancho.
 */
import type { CanvasDef, CanvasZone, ParamValue } from '@velora/shared';
import { ApiError } from '../lib/errors.js';
import { loadTemplate } from '../lib/assets.js';
import { imageCache } from '../lib/cache.js';
import { safeFetch } from '../lib/http.js';
import { normalizeUpload, sniffImageMime, toDataUri } from '../lib/image.js';
import { cleanText, escapeXml, fitFontSize } from '../lib/text.js';
import { resolveSpecial, type SpecialContext } from './specials.js';
import { renderAnimated } from './animated.js';

export interface RenderCanvasOptions {
  canvas: CanvasDef;
  values: Record<string, ParamValue>;
  /** Imágenes ya subidas (POST) en data URI. */
  uploads?: Record<string, string>;
  baseUrl: string;
}

export interface CanvasResult {
  svg: string;
  width: number;
  height: number;
  warnings: string[];
}

const REFERENCE_WIDTH = 736;

function textColor(zone: CanvasZone, values: Record<string, ParamValue>): string {
  const override = zone.colorParam ? values[zone.colorParam] : undefined;
  return String(override ?? zone.color ?? '#111111');
}

function fillColor(zone: CanvasZone, values: Record<string, ParamValue>): string {
  const override = zone.fillParam ? values[zone.fillParam] : undefined;
  return String(override ?? zone.fill ?? '#ffffff');
}

function fontSizeFor(zone: CanvasZone, values: Record<string, ParamValue>, scale: number): number {
  const override = values.fontSize;
  const base = zone.sizeParam && values[zone.sizeParam] !== undefined ? Number(values[zone.sizeParam]) : undefined;
  const size = base ?? (override !== undefined ? Number(override) : zone.fontSize) ?? 32;
  return Math.max(6, size * scale);
}

function shapeElement(zone: CanvasZone, box: { x: number; y: number; w: number; h: number }): string {
  const { x, y, w, h } = box;
  if (zone.shape === 'circle' || zone.shape === 'ellipse') {
    const rx = zone.shape === 'circle' ? Math.min(w, h) / 2 : w / 2;
    const ry = zone.shape === 'circle' ? Math.min(w, h) / 2 : h / 2;
    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${rx}" ry="${ry}"/>`;
  }
  const radius = zone.radius ?? 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${radius ? ` rx="${radius}"` : ''}/>`;
}

function textBlock(options: {
  zone: CanvasZone;
  box: { x: number; y: number; w: number; h: number };
  text: string;
  fontSize: number;
  color: string;
  animated?: { type: 'blink' | 'rainbow'; duration: number } | null;
}): string {
  const { zone, box, text, fontSize, color } = options;
  const padding = (zone.padding ?? 12) * (fontSize / 30);
  const innerWidth = Math.max(8, box.w - padding * 2);
  const innerHeight = Math.max(8, box.h - padding * 2);
  const fitted = fitFontSize({ text, width: innerWidth, height: innerHeight, fontSize });
  const lineHeight = fitted.fontSize * 1.18;
  const blockHeight = fitted.lines.length * lineHeight;

  let startY: number;
  if (zone.valign === 'top') startY = box.y + padding + fitted.fontSize * 0.9;
  else if (zone.valign === 'bottom') startY = box.y + box.h - padding - blockHeight + fitted.fontSize * 0.9;
  else startY = box.y + box.h / 2 - blockHeight / 2 + fitted.fontSize * 0.82;

  const anchor = zone.align === 'left' ? 'start' : zone.align === 'right' ? 'end' : 'middle';
  const x =
    zone.align === 'left'
      ? box.x + padding
      : zone.align === 'right'
        ? box.x + box.w - padding
        : box.x + box.w / 2;

  const animation = options.animated
    ? `<animate attributeName="${
        options.animated.type === 'rainbow' ? 'fill' : 'opacity'
      }" values="${
        options.animated.type === 'rainbow'
          ? '#ff2d95;#ffd400;#42e86a;#00d4ff;#9b5cff;#ff2d95'
          : '1;0.25;1'
      }" dur="${options.animated.duration}s" repeatCount="indefinite"/>`
    : '';

  const lines = fitted.lines
    .map((line, index) =>
      `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<text x="${x}" y="${startY}" text-anchor="${anchor}" font-family="DejaVu Sans, Verdana, sans-serif" font-size="${fitted.fontSize.toFixed(
    2
  )}" font-weight="${zone.weight ?? 400}" fill="${escapeXml(color)}"${animation ? ` fill="${escapeXml(color)}"` : ''}>${animation}${lines}</text>`;
}

function imageBlock(zone: CanvasZone, box: { x: number; y: number; w: number; h: number }, dataUri: string): string {
  return `<image href="${dataUri}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid slice"/>`;
}

/** Descarga (o reutiliza) una imagen remota como data URI segura. */
async function resolveImage(value: unknown): Promise<string | null> {
  if (typeof value !== 'string' || !value) return null;
  if (value.startsWith('data:image/')) return value;
  const cached = imageCache.get(value);
  if (cached) return cached;

  try {
    const response = await safeFetch(value, { maxBytes: 6 * 1024 * 1024, timeoutMs: 7000 });
    if (!response.ok) return null;
    const mime = sniffImageMime(response.buffer);
    if (!mime || mime === 'image/svg+xml') return null;
    const dataUri = toDataUri(response.buffer, mime);
    imageCache.set(value, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}

export async function renderCanvas(options: RenderCanvasOptions): Promise<CanvasResult> {
  const { canvas, values, uploads = {} } = options;

  const width = Math.round(Number(values.width ?? canvas.width));
  const height = Math.round(Number(values.height ?? canvas.height));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
    throw ApiError.badRequest('Las dimensiones solicitadas no son válidas.', { width, height });
  }
  if (width > 2048 || height > 2048) {
    throw ApiError.badRequest('El tamaño máximo es 2048×2048 px.', { width, height });
  }

  const warnings: string[] = [];
  const images: Record<string, string> = {};

  // 1. Canvas animados: se generan íntegramente en SVG (sin plantilla raster).
  if (canvas.slug === 'bratvideo' || canvas.slug === 'attp') {
    const svg = renderAnimated(canvas, values);
    return { svg, width, height, warnings };
  }

  const template = await loadTemplate(canvas.template);
  if (template.mime.startsWith('video/')) {
    throw ApiError.internal(`La plantilla «${canvas.template}» es un vídeo y no se puede usar como fondo.`);
  }

  // 2. Imágenes subidas por POST (data URI ya validado por multer + sharp).
  for (const [name, dataUri] of Object.entries(uploads)) images[name] = dataUri;

  // 3. Imágenes por URL de la query.
  const imageParams = canvas.params.filter((p) => p.type === 'image');
  await Promise.all(
    imageParams.map(async (param) => {
      if (images[param.name]) return;
      const raw = values[param.name];
      if (typeof raw !== 'string' || !raw) return;
      const dataUri = raw.startsWith('data:image/') ? raw : await resolveImage(raw);
      if (dataUri) images[param.name] = dataUri;
      else warnings.push(`No se pudo descargar «${param.name}»; se usó el contenido de respaldo.`);
    })
  );

  // 4. Canvas especiales (composiciones programáticas).
  const special = resolveSpecial(canvas.slug);
  if (special) {
    const context: SpecialContext = { canvas, values, images, template, warnings };
    const svg = await special(context);
    return { svg, width, height, warnings };
  }

  // 5. Composición declarativa por zonas.
  const scale = canvas.width / REFERENCE_WIDTH;
  const background = values.transparent === false ? String(values.background ?? '#ffffff') : null;

  const effects: string[] = [];
  if (canvas.slug === 'gay') {
    const opacity = Math.min(1, Math.max(0, Number(values.opacity ?? 0.45)));
    effects.push(
      `<rect width="${canvas.width}" height="${canvas.height}" fill="url(#rainbow)" opacity="${opacity}"/>`
    );
  }

  const templateImage = `<image href="${template.dataUri}" width="${canvas.width}" height="${canvas.height}" preserveAspectRatio="none"${
    canvas.slug === 'invert' ? ' filter="url(#invertFilter)"' : ''
  }/>`;

  const zones = canvas.zones
    .map((zone, index) => renderZone(zone, index, canvas, values, images, scale))
    .join('');

  const body = `${background ? `<rect width="${canvas.width}" height="${canvas.height}" fill="${escapeXml(background)}"/>` : ''}
  ${templateImage}
  ${effects.join('')}
  ${zones}`;

  return {
    svg: wrapSvg(canvas, body, { width, height, template: { dataUri: template.dataUri, mime: template.mime }, isolated: true }),
    width,
    height,
    warnings,
  };
}

function renderZone(
  zone: CanvasZone,
  index: number,
  canvas: CanvasDef,
  values: Record<string, ParamValue>,
  images: Record<string, string>,
  scale: number
): string {
  const box = {
    x: zone.x * canvas.width,
    y: zone.y * canvas.height,
    w: Math.max(1, zone.w * canvas.width),
    h: Math.max(1, zone.h * canvas.height),
  };
  const clipId = `zone${index}`;
  const imageData = zone.imageParam ? images[zone.imageParam] : undefined;
  const rawText = zone.textParam ? cleanText(values[zone.textParam], 400) : '';
  const fill = fillColor(zone, values);
  const showText = zone.mode !== 'image' && rawText.length > 0;

  // Sin imagen ni texto la zona se deja intacta: así se conserva la plantilla
  // original en lugar de pintar un rectángulo vacío.
  if (!imageData && !showText) return '';

  const pieces: string[] = [];
  pieces.push(`<clipPath id="${clipId}">${shapeElement(zone, box)}</clipPath>`);
  pieces.push(`<g clip-path="url(#${clipId})">`);
  if (fill !== 'transparent') {
    pieces.push(`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="${escapeXml(fill)}"/>`);
  }
  if (imageData) {
    pieces.push(imageBlock(zone, box, imageData));
  } else {
    pieces.push(
      textBlock({
        zone,
        box,
        text: rawText,
        fontSize: fontSizeFor(zone, values, scale),
        color: textColor(zone, values),
      })
    );
  }
  pieces.push('</g>');
  return pieces.join('');
}

/** Envuelve el cuerpo en un SVG con la vista y las definiciones necesarias. */
function wrapSvg(
  canvas: CanvasDef,
  body: string,
  options: {
    width: number;
    height: number;
    template: { dataUri: string; mime: string };
    isolated?: boolean;
  }
): string {
  const { width, height } = options;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <defs>
    <filter id="invertFilter"><feColorMatrix type="matrix" values="-1 0 0 0 1 0 -1 0 0 1 0 0 -1 0 1 0 0 0 1 0"/></filter>
    <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e40303"/><stop offset="0.2" stop-color="#ff8c00"/>
      <stop offset="0.4" stop-color="#ffed00"/><stop offset="0.6" stop-color="#008026"/>
      <stop offset="0.8" stop-color="#004dff"/><stop offset="1" stop-color="#750787"/>
    </linearGradient>
  </defs>
  ${body}
</svg>`;
}

/** Convierte un archivo subido en data URI normalizado. */
export async function prepareUpload(buffer: Buffer, maxBytes: number): Promise<string> {
  const normalized = await normalizeUpload(buffer, maxBytes);
  return normalized.dataUri;
}
