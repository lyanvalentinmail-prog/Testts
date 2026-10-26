/**
 * Canvas animados (Brat video y ATTP).
 *
 * Se genera un SVG con animación SMIL: no hace falta ffmpeg ni un navegador.
 * El navegador reproduce la animación y, si se pide PNG, resvg rasteriza el
 * fotograma base (el texto completo) porque ignora los elementos <animate>.
 *
 * Los MP4/WebM originales de Drive se conservan en assets/canvas como
 * referencia visual del efecto, pero no se usan como plantilla: generar vídeo
 * requiere ffmpeg, que no está disponible en Vercel por defecto.
 */
import type { CanvasDef, ParamValue } from '@velora/shared';
import { cleanText, escapeXml, fitFontSize } from '../lib/text.js';

const FONT = 'DejaVu Sans, Verdana, sans-serif';

function dimensions(canvas: CanvasDef, values: Record<string, ParamValue>) {
  return {
    width: Math.round(Number(values.width ?? canvas.width)),
    height: Math.round(Number(values.height ?? canvas.height)),
  };
}

function wrapWords(words: string[], maxWidth: number, fontSize: number): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  for (const word of words) {
    const tentative = [...current, word].join(' ');
    if (tentative.length * fontSize * 0.58 > maxWidth && current.length) {
      lines.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) lines.push(current);
  return lines;
}

/** Anima la aparición palabra por palabra (efecto del bratvideo original). */
function bratWords(canvas: CanvasDef, values: Record<string, ParamValue>): string {
  const { width, height } = dimensions(canvas, values);
  const text = cleanText(values.text ?? '', 160) || 'velora';
  const background = String(values.background ?? '#ffffff');
  const color = String(values.color ?? '#101010');
  const duration = Math.min(10, Math.max(0.4, Number(values.duration ?? 1.2)));
  const words = text.split(/\s+/).filter(Boolean);
  const frameCount = Number(values.frames) > 0 ? Math.min(words.length, Number(values.frames)) : words.length;

  const baseSize = Math.max(8, Number(values.fontSize ?? 64));
  const fitted = fitFontSize({
    text,
    width: canvas.width * 0.84,
    height: canvas.height * 0.8,
    fontSize: baseSize,
  });
  const fontSize = fitted.fontSize;
  const lineHeight = fontSize * 1.18;
  const lines = wrapWords(fitted.lines.join(' ').split(/\s+/).filter(Boolean), canvas.width * 0.86, fontSize);
  const blockHeight = lines.length * lineHeight;
  const startY = canvas.height / 2 - blockHeight / 2 + fontSize * 0.82;

  let wordIndex = 0;
  const tspans = lines.map((line, lineIndex) => {
    const spans = line
      .map((word) => {
        const position = frameCount <= 1 ? 0 : Math.min(0.95, wordIndex / frameCount);
        wordIndex += 1;
        const start = position.toFixed(3);
        const shown = Math.min(0.999, Number(start) + 0.02).toFixed(3);
        return `<tspan opacity="1"><animate attributeName="opacity" values="0;0;1;1" keyTimes="0;${start};${shown};1" dur="${duration}s" repeatCount="indefinite"/>${escapeXml(word)} </tspan>`;
      })
      .join('');
    return `<tspan x="${canvas.width / 2}"${lineIndex === 0 ? '' : ` dy="${lineHeight}"`}>${spans}</tspan>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="${canvas.width}" height="${canvas.height}" fill="${escapeXml(background)}"/>
  <text x="${canvas.width / 2}" y="${startY}" text-anchor="middle" font-family="${FONT}" font-size="${fontSize.toFixed(1)}" font-weight="700" fill="${escapeXml(color)}">${tspans.join('')}</text>
</svg>`;
}

/** Texto arcoíris palpitante (efecto del attp original). */
function attp(canvas: CanvasDef, values: Record<string, ParamValue>): string {
  const { width, height } = dimensions(canvas, values);
  const text = cleanText(values.text ?? '', 120) || 'velora';
  const background = String(values.background ?? '#000000');
  const color = String(values.color ?? '#ff2d95');
  const duration = Math.min(10, Math.max(0.4, Number(values.duration ?? 1.2)));

  const fitted = fitFontSize({
    text,
    width: canvas.width * 0.84,
    height: canvas.height * 0.8,
    fontSize: Math.max(8, Number(values.fontSize ?? 64)),
  });
  const lineHeight = fitted.fontSize * 1.18;
  const blockHeight = fitted.lines.length * lineHeight;
  const startY = canvas.height / 2 - blockHeight / 2 + fitted.fontSize * 0.82;

  const tspans = fitted.lines
    .map(
      (line, index) =>
        `<tspan x="${canvas.width / 2}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <rect width="${canvas.width}" height="${canvas.height}" fill="${escapeXml(background)}"/>
  <text x="${canvas.width / 2}" y="${startY}" text-anchor="middle" font-family="${FONT}" font-size="${fitted.fontSize.toFixed(1)}" font-weight="700" fill="${escapeXml(color)}">
    <animate attributeName="fill" values="#ff2d95;#ffd400;#42e86a;#00d4ff;#9b5cff;#ff2d95" dur="${duration}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;0.72;1" dur="${duration}s" repeatCount="indefinite"/>
    ${tspans}
  </text>
</svg>`;
}

export function renderAnimated(canvas: CanvasDef, values: Record<string, ParamValue>): string {
  if (canvas.slug === 'bratvideo') return bratWords(canvas, values);
  return attp(canvas, values);
}
