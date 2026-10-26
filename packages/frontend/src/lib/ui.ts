import type { CategoryId, HttpMethod } from '@velora/shared';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Colores por método HTTP: verde/azul/ámbar/rosa (accesibles sobre fondo oscuro). */
export const METHOD_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  GET: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  POST: {
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400',
  },
  PUT: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  DELETE: {
    text: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
  },
};

export function methodStyle(method: HttpMethod | string) {
  return METHOD_STYLES[String(method).toUpperCase()] ?? METHOD_STYLES.GET!;
}

/** Color de acento por categoría, alineado con el catálogo compartido. */
export const CATEGORY_ACCENT: Record<CategoryId, { hex: string; text: string; ring: string; soft: string }> = {
  canvas: {
    hex: '#8b5cf6',
    text: 'text-violet-300',
    ring: 'ring-violet-500/30',
    soft: 'bg-violet-500/10',
  },
  anime: {
    hex: '#f472b6',
    text: 'text-pink-300',
    ring: 'ring-pink-500/30',
    soft: 'bg-pink-500/10',
  },
  search: {
    hex: '#22d3ee',
    text: 'text-cyan-300',
    ring: 'ring-cyan-500/30',
    soft: 'bg-cyan-500/10',
  },
  download: {
    hex: '#34d399',
    text: 'text-emerald-300',
    ring: 'ring-emerald-500/30',
    soft: 'bg-emerald-500/10',
  },
  utilidades: {
    hex: '#fbbf24',
    text: 'text-amber-300',
    ring: 'ring-amber-500/30',
    soft: 'bg-amber-500/10',
  },
  sistema: {
    hex: '#60a5fa',
    text: 'text-blue-300',
    ring: 'ring-blue-500/30',
    soft: 'bg-blue-500/10',
  },
};

export function statusTone(status: number): { text: string; bg: string; border: string } {
  if (status === 0) return { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  if (status < 300) return { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  if (status < 400) return { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
  if (status < 500) return { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
}

export const OUTPUT_LABEL: Record<string, string> = {
  json: 'JSON',
  image: 'Imagen',
  file: 'Archivo',
  text: 'Texto',
  video: 'Vídeo',
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  canvas: 'Canvas',
  anime: 'Anime',
  search: 'Search',
  download: 'Download',
  utilidades: 'Utilidades',
  sistema: 'Sistema',
};
