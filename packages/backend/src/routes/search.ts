import { Router } from 'express';
import { validateQuery } from '../middleware/validate.js';
import { CATEGORIES, ENDPOINTS, searchEndpoints } from '@velora/shared';
import emojiData from '../data/emoji.json' with { type: 'json' };
import countriesData from '../data/countries.json' with { type: 'json' };
import { ApiError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { normalize, prng } from '../lib/text.js';
import { duckduckgo, hackernews, github, itunes, lrclib, openlibrary, openverse, wikipedia } from '../services/providers.js';

export const searchRouter = Router();

interface EmojiRow {
  emoji: string;
  name: string;
  category: string;
  aliases: string[];
  tags: string[];
  description: string | null;
}

interface CountryRow {
  name: string;
  official: string;
  code: string;
  code3: string;
  capital: string | null;
  region: string;
  subregion: string | null;
  languages: string[];
  currencies: Array<{ code: string; name: string; symbol: string | null }>;
  latlng: number[];
  area: number;
  population: number;
  timezones: string[];
  borders: string[];
  tld: string | null;
  callingCode: string;
  flag: string | null;
  flagPng: string | null;
  flagSvg: string | null;
  independent: boolean;
  unMember: boolean;
}

const EMOJIS = emojiData as EmojiRow[];
const COUNTRIES = countriesData as CountryRow[];

searchRouter.get('/web', validateQuery('search.web'), async (req, res) => {
  const result = await duckduckgo.web({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 8),
    ...(req.query_.site ? { site: String(req.query_.site) } : {}),
    ...(req.query_.region ? { region: String(req.query_.region) } : {}),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/images', validateQuery('search.images'), async (req, res) => {
  const result = await openverse.images({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    page: Number(req.query_.page ?? 1),
    ...(req.query_.license ? { license: String(req.query_.license) } : {}),
    ...(req.query_.aspect ? { aspect: String(req.query_.aspect) } : {}),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/lyrics', validateQuery('search.lyrics'), async (req, res) => {
  const result = await lrclib.search(String(req.query_.q ?? ''), Number(req.query_.limit ?? 10));
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/wikipedia', validateQuery('search.wikipedia'), async (req, res) => {
  const result = await wikipedia.search(
    String(req.query_.q ?? ''),
    String(req.query_.lang ?? 'es'),
    Number(req.query_.limit ?? 5)
  );
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/github', validateQuery('search.github'), async (req, res) => {
  const result = await github.repositories({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    ...(req.query_.language ? { language: String(req.query_.language) } : {}),
    ...(req.query_.sort ? { sort: String(req.query_.sort) } : {}),
    ...(req.query_.minStars !== undefined ? { minStars: Number(req.query_.minStars) } : {}),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/books', validateQuery('search.books'), async (req, res) => {
  const result = await openlibrary.books({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    page: Number(req.query_.page ?? 1),
    ...(req.query_.author ? { author: String(req.query_.author) } : {}),
    ...(req.query_.lang ? { lang: String(req.query_.lang) } : {}),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/itunes', validateQuery('search.itunes'), async (req, res) => {
  const result = await itunes.search({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    media: String(req.query_.media ?? 'music'),
    country: String(req.query_.country ?? 'US'),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/news', validateQuery('search.news'), async (req, res) => {
  const result = await hackernews.search({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    tags: String(req.query_.tags ?? 'story'),
    sort: String(req.query_.sort ?? 'relevance'),
  });
  ok(res, result, { cached: result.cached });
});

searchRouter.get('/emoji', validateQuery('search.emoji'), (req, res) => {
  const q = normalize(String(req.query_.q ?? ''));
  const category = typeof req.query_.category === 'string' ? req.query_.category : '';
  const limit = Number(req.query_.limit ?? 20);
  const random = req.query_.random === true;

  if (category && !['Smileys & Emotion', 'People & Body', 'Animals & Nature', 'Food & Drink', 'Travel & Places', 'Activities', 'Objects', 'Symbols', 'Flags'].includes(category)) {
    throw ApiError.badRequest(`La categoría «${category}» no existe.`);
  }

  let pool = EMOJIS.filter((emoji) => {
    if (category && emoji.category !== category) return false;
    if (!q) return true;
    const haystack = normalize([emoji.name, emoji.emoji, emoji.description ?? '', emoji.category, ...emoji.aliases, ...emoji.tags].join(' '));
    return haystack.includes(q);
  });

  if (random) {
    const seed = typeof req.query_.seed === 'string' ? req.query_.seed : String(Date.now());
    const generator = prng(`emoji:${seed}`);
    pool = [...pool]
      .map((emoji) => ({ emoji, order: generator() }))
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.emoji);
  }

  const results = pool.slice(0, limit);
  ok(res, {
    query: q || null,
    category: category || null,
    total: pool.length,
    returned: results.length,
    categories: [...new Set(EMOJIS.map((emoji) => emoji.category))],
    emojis: results,
    ...(random ? { seed: req.query_.seed ?? null } : {}),
  });
});

searchRouter.get('/countries', validateQuery('search.countries'), (req, res) => {
  const code = String(req.query_.code ?? '').toUpperCase();
  if (code) {
    const country = COUNTRIES.find((item) => item.code === code || item.code3 === code);
    if (!country) throw ApiError.notFound(`No existe el país con código «${code}».`);
    return ok(res, { country });
  }

  const q = normalize(String(req.query_.q ?? ''));
  const region = typeof req.query_.region === 'string' ? req.query_.region : '';
  const limit = Number(req.query_.limit ?? 10);

  const pool = COUNTRIES.filter((country) => {
    if (region && country.region !== region) return false;
    if (!q) return true;
    return normalize([country.name, country.official, country.capital ?? '', country.code, country.code3].join(' ')).includes(q);
  });

  return ok(res, {
    query: q || null,
    region: region || null,
    total: pool.length,
    regions: [...new Set(COUNTRIES.map((country) => country.region))].sort(),
    countries: pool.slice(0, limit),
  });
});

searchRouter.get('/endpoints', validateQuery('search.catalog'), (req, res) => {
  const q = String(req.query_.q ?? '');
  const category = typeof req.query_.category === 'string' ? req.query_.category : '';
  const method = typeof req.query_.method === 'string' ? req.query_.method : '';
  const limit = Number(req.query_.limit ?? 20);

  if (category && !CATEGORIES.some((item) => item.id === category)) {
    throw ApiError.badRequest(`La categoría «${category}» no existe.`);
  }

  const results = searchEndpoints({
    q,
    ...(category ? { category } : {}),
    ...(method ? { method } : {}),
    limit,
  }).map((endpoint) => ({
    id: endpoint.id,
    name: endpoint.name,
    category: endpoint.category,
    method: endpoint.method,
    path: endpoint.path,
    summary: endpoint.summary,
    output: endpoint.output,
    featured: endpoint.featured ?? false,
  }));

  ok(res, {
    query: q || null,
    filters: { category: category || null, method: method || null },
    total: results.length,
    catalogTotal: ENDPOINTS.length,
    results,
  });
});
