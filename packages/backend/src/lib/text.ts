/** Utilidades de texto deterministas para composición de imágenes. */

export function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Limpia caracteres de control y normaliza espacios. */
export function cleanText(value: unknown, maxLength = 500): string {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Ancho aproximado de un texto en em para DejaVu Sans. */
export function textWidthEm(text: string, weight = 400): number {
  const factor = weight >= 600 ? 0.62 : 0.58;
  let width = 0;
  for (const char of text) {
    if (char === ' ') width += 0.3;
    else if ('il.,:;!|\'`'.includes(char)) width += 0.28;
    else if ('mwMW@'.includes(char)) width += 0.9;
    else if (char >= 'A' && char <= 'Z') width += 0.68;
    else width += factor;
  }
  return width;
}

export function wrapText(text: string, maxWidthPx: number, fontSize: number, maxLines = 12): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidthEm(candidate) * fontSize > maxWidthPx && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }

  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]?.replace(/[.,;:]?$/, '')}…`;
    return kept;
  }
  return lines;
}

/** Ajusta el tamaño de fuente hasta que el texto entra en la caja. */
export function fitFontSize(options: {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  lineHeight?: number;
  minFontSize?: number;
}): { fontSize: number; lines: string[] } {
  const lineHeight = options.lineHeight ?? 1.18;
  const minFontSize = options.minFontSize ?? 8;
  let fontSize = options.fontSize;
  let lines = wrapText(options.text, options.width, fontSize);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    lines = wrapText(options.text, options.width, fontSize, 40);
    const maxLines = Math.max(1, Math.floor(options.height / (fontSize * lineHeight)));
    if (lines.length <= maxLines) break;
    if (fontSize <= minFontSize) break;
    fontSize = Math.max(minFontSize, fontSize * 0.9);
  }

  const maxLines = Math.max(1, Math.floor(options.height / (fontSize * lineHeight)));
  if (lines.length > maxLines) lines = wrapText(options.text, options.width, fontSize, maxLines);
  return { fontSize, lines };
}

/** PRNG determinista (mulberry32) a partir de una semilla de texto. */
export function prng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Color HSL estable para un texto. */
export function colorFromText(text: string): string {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return `hsl(${hash % 360} 62% 52%)`;
}

export function initials(name: string, count = 2): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, count)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return letters || 'V';
}

/** Escala un texto de forma segura para usarlo en un nombre de archivo. */
export function safeFilename(value: string, fallback = 'velora'): string {
  const normalized = normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized || fallback;
}

/** Determina si un color es claro (para elegir texto negro o blanco). */
export function isLightColor(hex: string): boolean {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return true;
  let value = match[1] as string;
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
