import { Router } from 'express';
import { validatePath, validateQuery } from '../middleware/validate.js';
import { CHARACTERS } from '../data/characters.js';
import { ApiError } from '../lib/errors.js';
import { renderImage, type ImageFormat } from '../lib/image.js';
import { binary, ok, redirect } from '../lib/respond.js';
import { colorFromText, escapeXml, initials, normalize, prng } from '../lib/text.js';
import { jikan } from '../services/providers.js';

export const animeRouter = Router();

const RARITIES = [
  { name: 'R', weight: 0.55, stars: 1, color: '#94a3b8' },
  { name: 'SR', weight: 0.3, stars: 2, color: '#60a5fa' },
  { name: 'SSR', weight: 0.12, stars: 3, color: '#c084fc' },
  { name: 'UR', weight: 0.03, stars: 4, color: '#fbbf24' },
];

function avatarSvg(name: string, size = 400): string {
  const color = colorFromText(name);
  const letters = escapeXml(initials(name));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#101322"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" rx="64" fill="url(#g)"/>
  <circle cx="200" cy="158" r="70" fill="#ffffff" opacity="0.92"/>
  <path d="M66 372c0-82 60-132 134-132s134 50 134 132" fill="#ffffff" opacity="0.92"/>
  <text x="200" y="332" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="84" font-weight="700" fill="#101322">${letters}</text>
  <text x="200" y="388" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="20" letter-spacing="3" fill="#ffffff">${escapeXml(
    name.slice(0, 26).toUpperCase()
  )}</text>
</svg>`;
}

function localCharacter(character: (typeof CHARACTERS)[number], baseUrl: string) {
  return {
    ...character,
    avatar: `${baseUrl}/api/anime/avatar?name=${encodeURIComponent(character.nombre)}`,
  };
}

function pick<T>(list: T[], seed: string | undefined, salt = ''): T {
  if (list.length === 0) throw ApiError.internal('La lista está vacía.');
  if (!seed) return list[Math.floor(Math.random() * list.length)] as T;
  const random = prng(`${salt}:${seed}`)();
  return list[Math.floor(random * list.length) % list.length] as T;
}

animeRouter.get('/search', validateQuery('anime.search'), async (req, res) => {
  const result = await jikan.searchAnime({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    page: Number(req.query_.page ?? 1),
    ...(req.query_.type ? { type: String(req.query_.type) } : {}),
    ...(req.query_.status ? { status: String(req.query_.status) } : {}),
    ...(req.query_.minScore !== undefined ? { minScore: Number(req.query_.minScore) } : {}),
    ...(req.query_.orderBy ? { orderBy: String(req.query_.orderBy) } : {}),
    sfw: req.query_.sfw !== false,
  });
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/anime/:id', validatePath('anime.get'), validateQuery('anime.get'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('El ID debe ser un entero positivo.');
  const result = await jikan.getAnime(id);
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/manga', validateQuery('anime.manga'), async (req, res) => {
  const result = await jikan.searchManga({
    q: String(req.query_.q ?? ''),
    limit: Number(req.query_.limit ?? 10),
    page: Number(req.query_.page ?? 1),
    ...(req.query_.type ? { type: String(req.query_.type) } : {}),
  });
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/characters', validateQuery('anime.characters'), async (req, res) => {
  const q = String(req.query_.q ?? '');
  const limit = Number(req.query_.limit ?? 10);
  try {
    const result = await jikan.searchCharacters({ q, limit, page: Number(req.query_.page ?? 1) });
    return ok(res, { source: 'jikan', ...result }, { cached: result.cached });
  } catch (error) {
    // Respaldo local: el endpoint nunca deja al cliente sin datos.
    const local = CHARACTERS.filter((character) => normalize(`${character.nombre} ${character.anime}`).includes(normalize(q))).slice(0, limit);
    return ok(res, {
      source: 'local',
      query: q,
      total: local.length,
      results: local.map((character) => localCharacter(character, req.meta.baseUrl)),
      notice:
        'Jikan no respondió: se muestran coincidencias del elenco local de Velora (48 personajes).',
      providerError: error instanceof Error ? error.message : 'error desconocido',
    });
  }
});

animeRouter.get('/character/random', validateQuery('anime.character'), (req, res) => {
  const gender = typeof req.query.gender === 'string' ? req.query.gender : '';
  const pool = gender ? CHARACTERS.filter((character) => character.genero === gender) : CHARACTERS;
  const character = pick(pool, typeof req.query.seed === 'string' ? req.query.seed : undefined, 'character');
  ok(res, {
    source: 'local',
    total: pool.length,
    character: localCharacter(character, req.meta.baseUrl),
  });
});

animeRouter.get('/waifu', validateQuery('anime.waifu'), (req, res) => {
  const women = CHARACTERS.filter((character) => character.genero === 'mujer');
  const character = pick(women, typeof req.query.seed === 'string' ? req.query.seed : undefined, 'waifu');
  if (String(req.query.asImage ?? '') === 'true') {
    return redirect(res, `${req.meta.baseUrl}/api/anime/avatar?name=${encodeURIComponent(character.nombre)}`);
  }
  return ok(res, { source: 'local', character: localCharacter(character, req.meta.baseUrl) });
});

animeRouter.get('/maid', validateQuery('anime.maid'), (req, res) => {
  const maids = CHARACTERS.filter((character) => character.maid);
  const character = pick(maids, typeof req.query.seed === 'string' ? req.query.seed : undefined, 'maid');
  ok(res, { source: 'local', total: maids.length, character: localCharacter(character, req.meta.baseUrl) });
});

animeRouter.get('/gacha', validateQuery('anime.gacha'), (req, res) => {
  const pulls = Math.min(25, Math.max(1, Number(req.query_.pulls ?? 10)));
  const seed = String(req.query_.seed ?? Date.now());
  const random = prng(`gacha:${seed}`);
  const results = Array.from({ length: pulls }, (_, index) => {
    const roll = random();
    let cumulative = 0;
    let rarity = RARITIES[0]!;
    for (const option of RARITIES) {
      cumulative += option.weight;
      if (roll <= cumulative) {
        rarity = option;
        break;
      }
    }
    const character = CHARACTERS[Math.floor(random() * CHARACTERS.length)] ?? CHARACTERS[0]!;
    return {
      pull: index + 1,
      rarity: rarity.name,
      stars: '★'.repeat(rarity.stars),
      rarityColor: rarity.color,
      ...localCharacter(character, req.meta.baseUrl),
    };
  });

  const best = results.reduce((best, current) =>
    RARITIES.findIndex((r) => r.name === current.rarity) > RARITIES.findIndex((r) => r.name === best.rarity) ? current : best
  );

  ok(res, {
    seed,
    pulls,
    probabilities: Object.fromEntries(RARITIES.map((rarity) => [rarity.name, `${Math.round(rarity.weight * 100)}%`])),
    best: { rarity: best.rarity, character: best.nombre },
    results,
  });
});

animeRouter.get('/avatar', validateQuery('anime.avatar'), async (req, res) => {
  const name = String(req.query_.name ?? 'Velora');
  const size = Math.min(1024, Math.max(64, Number(req.query_.size ?? 400)));
  const format = (String(req.query_.format ?? 'png') === 'svg' ? 'svg' : 'png') as ImageFormat;
  const svg = avatarSvg(name, size);
  const image = await renderImage(svg, { width: size, height: size, format });
  res.setHeader('X-Velora-Format', format);
  return binary(res, image.buffer, image.mime, {
    filename: `avatar-${normalize(name).replace(/\W+/g, '-') || 'velora'}.${image.extension}`,
    cacheSeconds: 86400,
  });
});

animeRouter.get('/seasonal', validateQuery('anime.seasonal'), async (req, res) => {
  const year = req.query_.year !== undefined ? Number(req.query_.year) : undefined;
  const season = req.query_.season !== undefined ? String(req.query_.season) : undefined;
  if ((year && !season) || (!year && season)) {
    throw ApiError.badRequest('Indica `year` y `season` juntos, o ninguno para la temporada actual.');
  }
  const result = await jikan.seasonal({
    ...(year ? { year } : {}),
    ...(season ? { season } : {}),
    limit: Number(req.query_.limit ?? 10),
  });
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/schedule', validateQuery('anime.schedule'), async (req, res) => {
  const day = typeof req.query_.day === 'string' ? req.query_.day : undefined;
  const result = await jikan.schedule(day, Number(req.query_.limit ?? 10));
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/top', validateQuery('anime.top'), async (req, res) => {
  const type = String(req.query_.type ?? 'anime') === 'manga' ? 'manga' : 'anime';
  const result = await jikan.top({
    type,
    ...(req.query_.filter ? { filter: String(req.query_.filter) } : {}),
    limit: Number(req.query_.limit ?? 10),
    page: Number(req.query_.page ?? 1),
  });
  ok(res, result, { cached: result.cached });
});

animeRouter.get('/character-image', validateQuery('anime.characterImage'), async (req, res) => {
  const name = String(req.query_.name ?? '');
  let image: string | null = null;
  try {
    image = await jikan.characterImage(name);
  } catch {
    image = null;
  }
  if (image) return redirect(res, image);

  const fallback = typeof req.query_.fallback === 'string' ? req.query_.fallback : '';
  if (fallback) return redirect(res, fallback);

  const avatar = avatarSvg(name);
  const rendered = await renderImage(avatar, { width: 400, height: 400, format: 'png' });
  return binary(res, rendered.buffer, rendered.mime, { filename: 'avatar.png', cacheSeconds: 3600 });
});
