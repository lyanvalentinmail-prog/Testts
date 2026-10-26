import { createHash, randomInt, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { validateBody, validatePath, validateQuery } from '../middleware/validate.js';
import { ApiError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { normalize, prng } from '../lib/text.js';
import { notesStore, parseNoteInput } from '../services/notes.js';

export const utilsRouter = Router();

/* ---------------------------------- UUID ---------------------------------- */

function uuidV7(): string {
  const timestamp = BigInt(Date.now());
  const random = Buffer.from(crypto.getRandomValues(new Uint8Array(10)));
  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(Number(timestamp >> 16n), 0, 4);
  bytes.writeUInt16BE(Number(timestamp & 0xffffn), 4);
  random.copy(bytes, 6);
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

utilsRouter.get('/uuid', validateQuery('utils.uuid'), (req, res) => {
  const count = Math.min(50, Math.max(1, Number(req.query_.count ?? 1)));
  const version = String(req.query_.version ?? 'v4');
  const uppercase = req.query_.uppercase === true;
  const uuids = Array.from({ length: count }, () => {
    const value = version === 'v7' ? uuidV7() : randomUUID();
    return uppercase ? value.toUpperCase() : value;
  });
  ok(res, { count, version, uuids, first: uuids[0] });
});

/* -------------------------------- Password -------------------------------- */

const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/';
const AMBIGUOUS = new Set(['O', '0', 'o', 'l', '1', 'I', '|']);

utilsRouter.get('/password', validateQuery('utils.password'), (req, res) => {
  const length = Math.min(128, Math.max(8, Number(req.query_.length ?? 20)));
  const count = Math.min(20, Math.max(1, Number(req.query_.count ?? 1)));
  const withSymbols = req.query_.symbols !== false;
  const withNumbers = req.query_.numbers !== false;
  const avoidAmbiguous = req.query_.avoidAmbiguous === true;

  let alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (withNumbers) alphabet += '0123456789';
  if (withSymbols) alphabet += SYMBOLS;
  if (avoidAmbiguous) alphabet = [...alphabet].filter((char) => !AMBIGUOUS.has(char)).join('');

  const passwords = Array.from({ length: count }, () =>
    Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join('')
  );

  const entropyBits = Math.round(length * Math.log2(alphabet.length));
  const strength = entropyBits >= 90 ? 'muy alta' : entropyBits >= 70 ? 'alta' : entropyBits >= 50 ? 'media' : 'baja';

  ok(res, {
    count,
    length,
    alphabetSize: alphabet.length,
    options: { symbols: withSymbols, numbers: withNumbers, avoidAmbiguous },
    entropyBits,
    strength,
    passwords,
  });
});

/* ---------------------------------- Hash ---------------------------------- */

utilsRouter.get('/hash', validateQuery('utils.hash'), (req, res) => {
  const text = String(req.query_.text ?? '');
  const algorithm = String(req.query_.algorithm ?? 'sha256').toLowerCase();
  const supported = ['md5', 'sha1', 'sha256', 'sha512', 'sha3-256', 'sha3-512'];
  if (!supported.includes(algorithm)) {
    throw ApiError.badRequest(`El algoritmo «${algorithm}» no está soportado.`, { soportados: supported });
  }
  const hash = createHash(algorithm);
  hash.update(text, 'utf8');
  const hex = hash.digest('hex');
  const bytes = hex.length / 2;
  ok(res, {
    text,
    algorithm,
    hex,
    base64: Buffer.from(hex, 'hex').toString('base64'),
    bits: bytes * 8,
    bytes,
    inputBytes: Buffer.byteLength(text, 'utf8'),
  });
});

/* --------------------------------- Base64 --------------------------------- */

utilsRouter.get('/base64', validateQuery('utils.base64'), (req, res) => {
  const text = String(req.query_.text ?? '');
  const action = String(req.query_.action ?? 'encode');
  const urlSafe = req.query_.urlSafe === true;

  if (action === 'encode') {
    let encoded = Buffer.from(text, 'utf8').toString('base64');
    if (urlSafe) encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return ok(res, { action, urlSafe, input: text, output: encoded, bytes: Buffer.byteLength(text, 'utf8') });
  }

  if (action !== 'decode') throw ApiError.badRequest('La acción debe ser encode o decode.');
  const normalized = urlSafe ? text.replace(/-/g, '+').replace(/_/g, '/') : text;
  try {
    const decoded = Buffer.from(normalized, 'base64');
    const output = decoded.toString('utf8');
    if (!/^[\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]*$/.test(output)) {
      throw ApiError.badRequest('El Base64 no contiene texto UTF-8 válido.', { longitud: text.length });
    }
    return ok(res, { action, urlSafe, input: text, output, bytes: decoded.length });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('El texto no es Base64 válido.');
  }
});

/* ---------------------------------- Slug ---------------------------------- */

utilsRouter.get('/slug', validateQuery('utils.slug'), (req, res) => {
  const text = String(req.query_.text ?? '');
  const separator = String(req.query_.separator ?? '-');
  const maxLength = Math.min(200, Math.max(10, Number(req.query_.maxLength ?? 80)));
  let slug = normalize(text)
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${escapeRegExp(separator)}+`, 'g'), separator)
    .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, 'g'), '');
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    const lastSeparator = slug.lastIndexOf(separator);
    if (lastSeparator > 0) slug = slug.slice(0, lastSeparator);
  }
  ok(res, { input: text, slug, separator, length: slug.length });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ---------------------------------- Color --------------------------------- */

function parseColor(input: string): { r: number; g: number; b: number; a: number } {
  const value = input.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
  if (hex) {
    let digits = hex[1] as string;
    if (digits.length === 3) digits = digits.split('').map((char) => char + char).join('');
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const a = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:[\s,/]+([\d.]+))?\s*\)$/.exec(value);
  if (rgb) {
    const [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
    if ([r, g, b].some((channel) => channel > 255)) throw ApiError.badRequest('Los canales RGB deben estar entre 0 y 255.');
    return { r, g, b, a: rgb[4] ? Number(rgb[4]) : 1 };
  }
  const hsl = /^hsla?\(\s*(\d{1,3})[\s,]+(\d{1,3})%[\s,]+(\d{1,3})%(?:[\s,/]+([\d.]+))?\s*\)$/.exec(value);
  if (hsl) {
    const [h, s, l] = [Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100];
    return { ...hslToRgb(h, s, l), a: hsl[4] ? Number(hsl[4]) : 1 };
  }
  throw ApiError.badRequest(`«${input}» no es un color válido.`, {
    formatos: ['#7c3aed', '#fff', 'rgb(124, 58, 237)', 'hsl(258, 90%, 58%)'],
  });
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
  else h = 60 * ((rn - gn) / delta + 4);
  return { h: Math.round((h + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const toHex = (value: number) => value.toString(16).padStart(2, '0');

utilsRouter.get('/color', validateQuery('utils.color'), (req, res) => {
  const input = String(req.query_.color ?? '');
  const { r, g, b, a } = parseColor(input);
  const hsl = rgbToHsl(r, g, b);
  const luminance = relativeLuminance(r, g, b);
  const contrastWhite = (1.05) / (luminance + 0.05);
  const contrastBlack = (luminance + 0.05) / 0.05;
  const tones = Math.min(12, Math.max(3, Number(req.query_.tones ?? 9)));

  const scale = Array.from({ length: tones }, (_, index) => {
    const lightness = Math.round(95 - (index * 80) / (tones - 1));
    const rgb = hslToRgb(hsl.h, hsl.s / 100, lightness / 100);
    return {
      step: (index + 1) * 50,
      hex: `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`,
      lightness,
    };
  });

  ok(res, {
    input,
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    hexAlpha: a < 1 ? `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}` : undefined,
    rgb: { r, g, b, a },
    rgbString: a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`,
    hsl: { ...hsl, css: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    luminance: Math.round(luminance * 10000) / 10000,
    contrast: {
      white: Math.round(contrastWhite * 100) / 100,
      black: Math.round(contrastBlack * 100) / 100,
      wcagAA: Math.max(contrastWhite, contrastBlack) >= 4.5,
      wcagAAA: Math.max(contrastWhite, contrastBlack) >= 7,
    },
    recommendedTextColor: contrastWhite >= contrastBlack ? '#ffffff' : '#000000',
    complementary: `#${(() => {
      const rgb = hslToRgb((hsl.h + 180) % 360, hsl.s / 100, hsl.l / 100);
      return `${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    })()}`,
    scale,
  });
});

/* ---------------------------------- Texto --------------------------------- */

utilsRouter.get('/text', validateQuery('utils.text'), (req, res) => {
  const text = String(req.query_.text ?? '');
  const action = String(req.query_.action ?? 'stats');

  const transforms: Record<string, () => string> = {
    upper: () => text.toUpperCase(),
    lower: () => text.toLowerCase(),
    title: () => text.replace(/\p{L}[\p{L}'’]*/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()),
    camel: () =>
      normalize(text)
        .replace(/[^a-z0-9]+(.)/g, (_match, char: string) => char.toUpperCase())
        .replace(/^[^a-zA-Z]+/, ''),
    snake: () => normalize(text).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
    kebab: () => normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    reverse: () => [...text].reverse().join(''),
    trim: () => text.trim(),
  };

  if (action === 'stats') {
    const words = text.trim() ? text.trim().split(/\s+/) : [];
    const sentences = text.split(/[.!?…]+/).filter((sentence) => sentence.trim().length > 0);
    const frequency = new Map<string, number>();
    for (const word of words) {
      const key = normalize(word).replace(/[^a-z0-9áéíóúñü]/g, '');
      if (!key) continue;
      frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }
    const topWords = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return ok(res, {
      action,
      stats: {
        characters: [...text].length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: words.length,
        uniqueWords: frequency.size,
        lines: text.split(/\r\n|\r|\n/).length,
        sentences: sentences.length,
        paragraphs: text.split(/\n{2,}/).filter((paragraph) => paragraph.trim()).length,
        bytes: Buffer.byteLength(text, 'utf8'),
        readingTimeMinutes: Math.max(1, Math.round(words.length / 200)),
        longestWord: words.reduce((longest, word) => (word.length > longest.length ? word : longest), ''),
      },
      topWords,
    });
  }

  const transform = transforms[action];
  if (!transform) {
    throw ApiError.badRequest(`La acción «${action}» no existe.`, { disponibles: ['stats', ...Object.keys(transforms)] });
  }
  return ok(res, { action, input: text, output: transform() });
});

/* ---------------------------------- Morse --------------------------------- */

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.', '/': '-..-.',
  '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
};
const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([letter, code]) => [code, letter])
);

utilsRouter.get('/morse', validateQuery('utils.morse'), (req, res) => {
  const text = String(req.query_.text ?? '');
  const action = String(req.query_.action ?? 'encode');

  if (action === 'encode') {
    const encoded = [...text.toUpperCase()]
      .map((char) => (char === ' ' ? '/' : MORSE[char] ?? '?'))
      .join(' ');
    return ok(res, { action, input: text, output: encoded });
  }
  if (action !== 'decode') throw ApiError.badRequest('La acción debe ser encode o decode.');

  const decoded = text
    .trim()
    .split(/\s+/)
    .map((token) => (token === '/' ? ' ' : MORSE_REVERSE[token] ?? '?'))
    .join('');
  return ok(res, { action, input: text, output: decoded });
});

/* --------------------------------- Random --------------------------------- */

utilsRouter.get('/random', validateQuery('utils.random'), (req, res) => {
  const type = String(req.query_.type ?? 'integer');
  const count = Math.min(100, Math.max(1, Number(req.query_.count ?? 1)));
  const min = Number(req.query_.min ?? 1);
  const max = Number(req.query_.max ?? 100);
  const seed = typeof req.query_.seed === 'string' ? req.query_.seed : '';
  if ((type === 'integer' || type === 'decimal') && min > max) {
    throw ApiError.badRequest('`min` no puede ser mayor que `max`.', { min, max });
  }

  const generator = seed ? prng(`random:${seed}`) : null;
  const value = (): number | string => {
    switch (type) {
      case 'integer':
        return generator ? Math.floor(min + generator() * (max - min + 1)) : randomInt(Math.ceil(min), Math.floor(max) + 1);
      case 'decimal':
        return Math.round((min + (generator ? generator() : Math.random()) * (max - min)) * 10000) / 10000;
      case 'color': {
        const random = generator ?? (() => Math.random());
        return `#${Array.from({ length: 3 }, () => Math.floor(random() * 256).toString(16).padStart(2, '0')).join('')}`;
      }
      case 'string': {
        const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const length = Math.min(128, Math.max(1, Number(max)));
        return Array.from({ length }, () => alphabet[Math.floor((generator ? generator() : Math.random()) * alphabet.length)]).join('');
      }
      default:
        throw ApiError.badRequest(`El tipo «${type}» no existe.`, { disponibles: ['integer', 'decimal', 'color', 'string'] });
    }
  };

  const values = Array.from({ length: count }, () => value());
  ok(res, { type, count, min, max, seed: seed || null, values });
});

/* ---------------------------------- Fecha --------------------------------- */

utilsRouter.get('/date', validateQuery('utils.date'), (req, res) => {
  const timezone = String(req.query_.timezone ?? 'America/Montevideo');
  const locale = String(req.query_.locale ?? 'es-UY');

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long',
    });
  } catch {
    throw ApiError.badRequest(`La zona horaria «${timezone}» o el idioma «${locale}» no son válidos.`, {
      ejemplos: ['America/Montevideo', 'Europe/Madrid', 'Asia/Tokyo'],
    });
  }

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
  const localIso = `${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}:${get('second')}`;

  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Number(now) - Number(start)) / 86_400_000);
  const offsetMinutes = -now.getTimezoneOffset();

  return ok(res, {
    timezone,
    locale,
    formatted: formatter.format(now),
    iso: now.toISOString(),
    localIso,
    utc: now.toUTCString(),
    timestamp: now.getTime(),
    unix: Math.floor(now.getTime() / 1000),
    offsetMinutes,
    dayOfYear,
    dayOfWeek: new Intl.DateTimeFormat(locale, { timeZone: timezone, weekday: 'long' }).format(now),
    month: new Intl.DateTimeFormat(locale, { timeZone: timezone, month: 'long' }).format(now),
  });
});

/* ---------------------------------- Notas --------------------------------- */

utilsRouter.get('/notes', validateQuery('utils.notes.list'), (req, res) => {
  const tag = typeof req.query_.tag === 'string' ? req.query_.tag : '';
  const limit = Number(req.query_.limit ?? 20);
  const notes = notesStore.list(tag || undefined, limit);
  ok(res, {
    total: notes.length,
    storage: 'memoria',
    persistent: false,
    notice: 'Almacén de demostración: en serverless se reinicia con cada arranque en frío.',
    notes,
  });
});

utilsRouter.post('/notes', validateBody('utils.notes.create'), (req, res) => {
  if (!req.is('application/json')) {
    throw ApiError.unsupportedMedia('El cuerpo debe enviarse como application/json.', {
      recibido: req.headers['content-type'] ?? null,
    });
  }
  const note = notesStore.create(parseNoteInput(req.body as Record<string, unknown>));
  ok(res, note, { status: 201 });
});

utilsRouter.get('/notes/:id', validatePath('utils.notes.get'), validateQuery('utils.notes.get'), (req, res) => {
  ok(res, notesStore.get(req.params.id as string));
});

utilsRouter.put('/notes/:id', validatePath('utils.notes.update'), validateBody('utils.notes.update'), (req, res) => {
  if (!req.is('application/json')) {
    throw ApiError.unsupportedMedia('El cuerpo debe enviarse como application/json.');
  }
  ok(res, notesStore.update(req.params.id as string, parseNoteInput(req.body as Record<string, unknown>)));
});

utilsRouter.delete('/notes/:id', validatePath('utils.notes.delete'), validateQuery('utils.notes.delete'), (req, res) => {
  const removed = notesStore.remove(req.params.id as string);
  ok(res, { deleted: true, id: removed.id, title: removed.title, deletedAt: new Date().toISOString() });
});
