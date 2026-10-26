/**
 * Adaptadores de proveedores externos.
 *
 * Cada función normaliza la respuesta del proveedor a un formato propio y
 * estable, cachea el resultado y traduce los fallos a errores 502/429 con
 * contexto. Todas las bases de URL son configurables por entorno para poder
 * apuntar a un mock en las pruebas.
 */
import { config } from '../config.js';
import { providerCache } from '../lib/cache.js';
import { ApiError } from '../lib/errors.js';
import { fetchJson, fetchText } from '../lib/http.js';
import { normalize } from '../lib/text.js';

async function cached<T>(key: string, factory: () => Promise<T>, ttl = config.cache.providerTtlMs): Promise<{ value: T; cached: boolean }> {
  return providerCache.wrap(key, factory, ttl) as Promise<{ value: T; cached: boolean }>;
}

function withQuery(base: string, path: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(`${base.replace(/\/$/, '')}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/* --------------------------------- Jikan ---------------------------------- */

interface JikanImages {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string };
}

interface JikanAnime {
  mal_id: number;
  url?: string;
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  titles?: Array<{ type: string; title: string }>;
  synopsis?: string | null;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  season?: string | null;
  year?: number | null;
  studios?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  themes?: Array<{ name: string }>;
  demographics?: Array<{ name: string }>;
  images?: JikanImages;
  trailer?: { youtube_id?: string | null; url?: string | null };
  broadcast?: { day?: string | null; time?: string | null };
}

interface JikanManga {
  mal_id: number;
  url?: string;
  title?: string;
  title_english?: string | null;
  synopsis?: string | null;
  type?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  status?: string | null;
  score?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  published?: { from?: string | null; to?: string | null };
  authors?: Array<{ name: string }>;
  genres?: Array<{ name: string }>;
  images?: JikanImages;
}

interface JikanCharacter {
  mal_id: number;
  url?: string;
  name?: string;
  name_kanji?: string | null;
  nicknames?: string[];
  favorites?: number;
  about?: string | null;
  images?: JikanImages;
  anime?: Array<{ anime?: { mal_id: number; title?: string; url?: string } }>;
  manga?: Array<{ manga?: { mal_id: number; title?: string; url?: string } }>;
}

interface JikanList<T> {
  data?: T[];
  pagination?: { last_visible_page?: number; has_next_page?: boolean; current_page?: number; items?: { total?: number } };
}

function animeSummary(anime: JikanAnime) {
  return {
    id: anime.mal_id,
    title: anime.title ?? 'Sin título',
    titleEnglish: anime.title_english ?? null,
    titleJapanese: anime.title_japanese ?? null,
    type: anime.type ?? null,
    episodes: anime.episodes ?? null,
    status: anime.status ?? null,
    airing: Boolean(anime.airing),
    duration: anime.duration ?? null,
    rating: anime.rating ?? null,
    score: anime.score ?? null,
    scoredBy: anime.scored_by ?? null,
    rank: anime.rank ?? null,
    popularity: anime.popularity ?? null,
    members: anime.members ?? null,
    favorites: anime.favorites ?? null,
    season: anime.season ?? null,
    year: anime.year ?? null,
    synopsis: anime.synopsis ? anime.synopsis.slice(0, 600) : null,
    genres: (anime.genres ?? []).map((genre) => genre.name),
    themes: (anime.themes ?? []).map((theme) => theme.name),
    studios: (anime.studios ?? []).map((studio) => studio.name),
    image: anime.images?.jpg?.large_image_url ?? anime.images?.jpg?.image_url ?? null,
    trailer: anime.trailer?.url ?? null,
    url: anime.url ?? `https://myanimelist.net/anime/${anime.mal_id}`,
  };
}

function mangaSummary(manga: JikanManga) {
  return {
    id: manga.mal_id,
    title: manga.title ?? 'Sin título',
    titleEnglish: manga.title_english ?? null,
    type: manga.type ?? null,
    chapters: manga.chapters ?? null,
    volumes: manga.volumes ?? null,
    status: manga.status ?? null,
    score: manga.score ?? null,
    rank: manga.rank ?? null,
    popularity: manga.popularity ?? null,
    members: manga.members ?? null,
    favorites: manga.favorites ?? null,
    published: manga.published ?? null,
    authors: (manga.authors ?? []).map((author) => author.name),
    genres: (manga.genres ?? []).map((genre) => genre.name),
    synopsis: manga.synopsis ? manga.synopsis.slice(0, 600) : null,
    image: manga.images?.jpg?.large_image_url ?? manga.images?.jpg?.image_url ?? null,
    url: manga.url ?? `https://myanimelist.net/manga/${manga.mal_id}`,
  };
}

function characterSummary(character: JikanCharacter) {
  return {
    id: character.mal_id,
    name: character.name ?? 'Desconocido',
    nameKanji: character.name_kanji ?? null,
    nicknames: character.nicknames ?? [],
    favorites: character.favorites ?? 0,
    about: character.about ? character.about.slice(0, 500) : null,
    image: character.images?.jpg?.image_url ?? null,
    anime: (character.anime ?? []).map((entry) => entry.anime?.title).filter(Boolean).slice(0, 5),
    manga: (character.manga ?? []).map((entry) => entry.manga?.title).filter(Boolean).slice(0, 5),
    url: character.url ?? `https://myanimelist.net/character/${character.mal_id}`,
  };
}

export const jikan = {
  async searchAnime(options: {
    q: string;
    limit: number;
    page: number;
    type?: string;
    status?: string;
    minScore?: number;
    orderBy?: string;
    sfw: boolean;
  }) {
    const url = withQuery(config.providers.jikan, '/anime', {
      q: options.q,
      limit: options.limit,
      page: options.page,
      type: options.type,
      status: options.status,
      min_score: options.minScore,
      order_by: options.orderBy,
      sort: options.orderBy ? 'desc' : undefined,
      sfw: options.sfw ? 'true' : undefined,
    });
    const { value, cached: fromCache } = await cached(`jikan:anime:${url}`, async () => {
      const { data } = await fetchJson<JikanList<JikanAnime>>(url);
      return {
        results: (data.data ?? []).map(animeSummary),
        pagination: data.pagination ?? null,
      };
    });
    return { ...value, cached: fromCache, provider: 'jikan', query: options.q };
  },

  async getAnime(id: number) {
    const url = withQuery(config.providers.jikan, `/anime/${id}/full`, {});
    const { value, cached: fromCache } = await cached(`jikan:anime:${id}`, async () => {
      const { data } = await fetchJson<{ data?: JikanAnime }>(url);
      if (!data.data) throw ApiError.notFound(`No existe el anime con ID ${id} en MyAnimeList.`);
      return animeSummary(data.data);
    });
    return { ...value, cached: fromCache, provider: 'jikan' };
  },

  async searchManga(options: { q: string; limit: number; page: number; type?: string }) {
    const url = withQuery(config.providers.jikan, '/manga', {
      q: options.q,
      limit: options.limit,
      page: options.page,
      type: options.type,
    });
    const { value, cached: fromCache } = await cached(`jikan:manga:${url}`, async () => {
      const { data } = await fetchJson<JikanList<JikanManga>>(url);
      return { results: (data.data ?? []).map(mangaSummary), pagination: data.pagination ?? null };
    });
    return { ...value, cached: fromCache, provider: 'jikan', query: options.q };
  },

  async searchCharacters(options: { q: string; limit: number; page: number }) {
    const url = withQuery(config.providers.jikan, '/characters', {
      q: options.q,
      limit: options.limit,
      page: options.page,
    });
    const { value, cached: fromCache } = await cached(`jikan:characters:${url}`, async () => {
      const { data } = await fetchJson<JikanList<JikanCharacter>>(url);
      return { results: (data.data ?? []).map(characterSummary), pagination: data.pagination ?? null };
    });
    return { ...value, cached: fromCache, provider: 'jikan', query: options.q };
  },

  async seasonal(options: { year?: number; season?: string; limit: number }) {
    const path = options.year && options.season ? `/seasons/${options.year}/${options.season}` : '/seasons/now';
    const url = withQuery(config.providers.jikan, path, { limit: options.limit, sfw: 'true' });
    const { value, cached: fromCache } = await cached(`jikan:seasonal:${url}`, async () => {
      const { data } = await fetchJson<JikanList<JikanAnime>>(url);
      return {
        season: options.season ?? null,
        year: options.year ?? null,
        results: (data.data ?? []).map(animeSummary),
        pagination: data.pagination ?? null,
      };
    });
    return { ...value, cached: fromCache, provider: 'jikan' };
  },

  async schedule(day?: string, limit = 10) {
    const url = withQuery(config.providers.jikan, '/schedules', { filter: day, sfw: 'true' });
    const { value, cached: fromCache } = await cached(`jikan:schedule:${day ?? 'all'}`, async () => {
      const { data } = await fetchJson<Record<string, JikanAnime[]>>(url);
      const days = day ? [day] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const results = days.flatMap((key) =>
        (data[key] ?? []).slice(0, limit).map((anime) => ({
          day: key,
          broadcast: anime.broadcast ?? null,
          ...animeSummary(anime),
        }))
      );
      return { results: results.slice(0, limit * (day ? 1 : 7)), days };
    });
    return { ...value, cached: fromCache, provider: 'jikan' };
  },

  async top(options: { type: 'anime' | 'manga'; filter?: string; limit: number; page: number }) {
    const url = withQuery(config.providers.jikan, `/top/${options.type}`, {
      filter: options.filter,
      limit: options.limit,
      page: options.page,
      sfw: 'true',
    });
    const { value, cached: fromCache } = await cached(`jikan:top:${url}`, async () => {
      const { data } = await fetchJson<JikanList<JikanAnime & JikanManga>>(url);
      const results = (data.data ?? []).map((item) =>
        options.type === 'anime' ? animeSummary(item as JikanAnime) : mangaSummary(item as JikanManga)
      );
      return { type: options.type, filter: options.filter ?? 'bypopularity', results, pagination: data.pagination ?? null };
    });
    return { ...value, cached: fromCache, provider: 'jikan' };
  },

  async characterImage(name: string): Promise<string | null> {
    const { value } = await cached(`jikan:characterImage:${normalize(name)}`, async () => {
      const url = withQuery(config.providers.jikan, '/characters', { q: name, limit: 1 });
      const { data } = await fetchJson<JikanList<JikanCharacter>>(url);
      const first = data.data?.[0];
      return first?.images?.jpg?.image_url ?? null;
    });
    return value;
  },
};

/* -------------------------------- Openverse ------------------------------- */

interface OpenverseImage {
  id: string;
  title?: string;
  creator?: string;
  creator_url?: string;
  url?: string;
  thumbnail?: string;
  license?: string;
  license_version?: string;
  license_url?: string;
  width?: number;
  height?: number;
  foreign_landing_url?: string;
  source?: string;
  tags?: Array<{ name: string }>;
}

export const openverse = {
  async images(options: { q: string; limit: number; page: number; license?: string; aspect?: string }) {
    const url = withQuery(config.providers.openverse, '/images', {
      q: options.q,
      page_size: options.limit,
      page: options.page,
      license: options.license && options.license !== 'all' ? options.license : undefined,
      aspect_ratio: options.aspect,
    });
    const { value, cached: fromCache } = await cached(`openverse:${url}`, async () => {
      const { data } = await fetchJson<{ result_count?: number; results?: OpenverseImage[] }>(url);
      const results = (data.results ?? []).map((image) => ({
        id: image.id,
        title: image.title ?? 'Sin título',
        creator: image.creator ?? 'Desconocido',
        source: image.source ?? null,
        license: image.license ? `${image.license.toUpperCase()} ${image.license_version ?? ''}`.trim() : 'desconocida',
        licenseUrl: image.license_url ?? null,
        image: image.url ?? null,
        thumbnail: image.thumbnail ?? image.url ?? null,
        width: image.width ?? null,
        height: image.height ?? null,
        page: image.foreign_landing_url ?? null,
        tags: (image.tags ?? []).map((tag) => tag.name).slice(0, 6),
        attribution: `${image.title ?? 'Imagen'} — ${image.creator ?? 'Desconocido'} (${(image.license ?? 'CC').toUpperCase()})`,
      }));
      return { total: data.result_count ?? results.length, results };
    });
    return { ...value, cached: fromCache, provider: 'openverse', query: options.q };
  },
};

/* --------------------------------- LRCLIB --------------------------------- */

interface LrclibRecord {
  id: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export const lrclib = {
  async search(q: string, limit: number) {
    const url = withQuery(config.providers.lrclib, '/search', { q });
    const { value, cached: fromCache } = await cached(`lrclib:search:${q}`, async () => {
      const { data } = await fetchJson<LrclibRecord[]>(url);
      const results = (Array.isArray(data) ? data : []).slice(0, limit).map((record) => ({
        id: record.id,
        title: record.trackName ?? 'Sin título',
        artist: record.artistName ?? 'Desconocido',
        album: record.albumName ?? null,
        duration: record.duration ?? null,
        instrumental: Boolean(record.instrumental),
        hasLyrics: Boolean(record.plainLyrics),
        hasSyncedLyrics: Boolean(record.syncedLyrics),
        lyrics: record.id ? `/api/download/lyrics?artist=${encodeURIComponent(record.artistName ?? '')}&track=${encodeURIComponent(record.trackName ?? '')}` : null,
      }));
      return { results, total: results.length };
    });
    return { ...value, cached: fromCache, provider: 'lrclib', query: q };
  },

  async get(options: { artist: string; track: string; album?: string; duration?: number }) {
    const url = withQuery(config.providers.lrclib, '/get', {
      artist_name: options.artist,
      track_name: options.track,
      album_name: options.album,
      duration: options.duration,
    });
    const { value, cached: fromCache } = await cached(`lrclib:get:${url}`, async () => {
      try {
        const { data } = await fetchJson<LrclibRecord>(url);
        if (!data || !data.plainLyrics) {
          throw ApiError.notFound(`No hay letra para «${options.track}» de «${options.artist}» en LRCLIB.`);
        }
        return {
          id: data.id,
          title: data.trackName ?? options.track,
          artist: data.artistName ?? options.artist,
          album: data.albumName ?? null,
          duration: data.duration ?? null,
          instrumental: Boolean(data.instrumental),
          lyrics: data.plainLyrics ?? '',
          syncedLyrics: data.syncedLyrics ?? null,
        };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) throw error;
        throw error;
      }
    });
    return { ...value, cached: fromCache, provider: 'lrclib' };
  },
};

/* -------------------------------- Wikipedia ------------------------------- */

export const wikipedia = {
  async search(q: string, lang: string, limit: number) {
    const base = config.providers.wikipedia.replace('{lang}', lang);
    const url = withQuery(base, '', {
      action: 'query',
      list: 'search',
      srsearch: q,
      srlimit: limit,
      format: 'json',
      origin: '*',
    });
    const { value, cached: fromCache } = await cached(`wiki:${lang}:${q}:${limit}`, async () => {
      const { data } = await fetchJson<{
        query?: { search?: Array<{ title: string; snippet?: string; size?: number; timestamp?: string; pageid: number }> };
      }>(url);
      const results = (data.query?.search ?? []).map((item) => ({
        title: item.title,
        snippet: (item.snippet ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
        size: item.size ?? 0,
        updated: item.timestamp ?? null,
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      }));
      return { results, total: results.length, language: lang };
    });
    return { ...value, cached: fromCache, provider: 'wikipedia', query: q };
  },
};

/* --------------------------------- GitHub --------------------------------- */

export const github = {
  async repositories(options: { q: string; limit: number; language?: string; sort?: string; minStars?: number }) {
    const query = [
      options.q,
      options.language ? `language:${options.language}` : '',
      options.minStars ? `stars:>=${options.minStars}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    const url = withQuery(config.providers.github, '/search/repositories', {
      q: query,
      per_page: options.limit,
      sort: options.sort === 'best-match' ? undefined : options.sort,
      order: 'desc',
    });
    const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
    if (config.secrets.githubToken) headers.authorization = `Bearer ${config.secrets.githubToken}`;

    const { value, cached: fromCache } = await cached(`github:${url}`, async () => {
      const { data } = await fetchJson<{
        total_count?: number;
        items?: Array<{
          id: number;
          full_name: string;
          html_url: string;
          description: string | null;
          stargazers_count: number;
          forks_count: number;
          language: string | null;
          license?: { spdx_id?: string } | null;
          topics?: string[];
          updated_at?: string;
          owner?: { avatar_url?: string };
        }>;
      }>(url, { headers });
      const results = (data.items ?? []).map((repo) => ({
        id: repo.id,
        name: repo.full_name,
        url: repo.html_url,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        license: repo.license?.spdx_id ?? null,
        topics: repo.topics ?? [],
        updatedAt: repo.updated_at ?? null,
        ownerAvatar: repo.owner?.avatar_url ?? null,
      }));
      return { total: data.total_count ?? results.length, results };
    });
    return { ...value, cached: fromCache, provider: 'github', query };
  },
};

/* ------------------------------- Open Library ------------------------------ */

export const openlibrary = {
  async books(options: { q: string; limit: number; author?: string; lang?: string; page: number }) {
    const query = [options.q, options.author ? `author:${options.author}` : '', options.lang ? `language:${options.lang}` : '']
      .filter(Boolean)
      .join(' ');
    const url = withQuery(config.providers.openlibrary, '/search.json', {
      q: query,
      limit: options.limit,
      page: options.page,
    });
    const { value, cached: fromCache } = await cached(`openlibrary:${url}`, async () => {
      const { data } = await fetchJson<{
        numFound?: number;
        docs?: Array<{
          key: string;
          title: string;
          author_name?: string[];
          first_publish_year?: number;
          cover_i?: number;
          edition_count?: number;
          language?: string[];
          subject?: string[];
        }>;
      }>(url);
      const results = (data.docs ?? []).map((book) => ({
        id: book.key,
        title: book.title,
        authors: book.author_name ?? [],
        firstPublished: book.first_publish_year ?? null,
        editions: book.edition_count ?? null,
        languages: book.language ?? [],
        subjects: (book.subject ?? []).slice(0, 6),
        cover: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : null,
        url: `https://openlibrary.org${book.key}`,
      }));
      return { total: data.numFound ?? results.length, results };
    });
    return { ...value, cached: fromCache, provider: 'openlibrary', query };
  },
};

/* --------------------------------- iTunes --------------------------------- */

export const itunes = {
  async search(options: { q: string; limit: number; media: string; country: string }) {
    const url = withQuery(config.providers.itunes, '/search', {
      term: options.q,
      limit: options.limit,
      media: options.media,
      country: options.country,
    });
    const { value, cached: fromCache } = await cached(`itunes:${url}`, async () => {
      const { data } = await fetchJson<{
        resultCount?: number;
        results?: Array<{
          wrapperType?: string;
          trackId?: number;
          collectionId?: number;
          trackName?: string;
          collectionName?: string;
          artistName?: string;
          artworkUrl100?: string;
          previewUrl?: string;
          trackViewUrl?: string;
          releaseDate?: string;
          trackTimeMillis?: number;
          primaryGenreName?: string;
        }>;
      }>(url);
      const results = (data.results ?? []).map((item) => ({
        id: item.trackId ?? item.collectionId ?? null,
        title: item.trackName ?? item.collectionName ?? 'Sin título',
        artist: item.artistName ?? null,
        album: item.collectionName ?? null,
        genre: item.primaryGenreName ?? null,
        releaseDate: item.releaseDate ?? null,
        durationMs: item.trackTimeMillis ?? null,
        artwork: item.artworkUrl100?.replace('100x100bb', '400x400bb') ?? null,
        preview: item.previewUrl ?? null,
        url: item.trackViewUrl ?? null,
      }));
      return { total: data.resultCount ?? results.length, results, media: options.media };
    });
    return { ...value, cached: fromCache, provider: 'itunes', query: options.q };
  },
};

/* ------------------------------- Hacker News ------------------------------ */

export const hackernews = {
  async search(options: { q: string; limit: number; tags: string; sort: string }) {
    const endpoint = options.sort === 'date' ? '/search_by_date' : '/search';
    const url = withQuery(config.providers.hn, endpoint, {
      query: options.q,
      tags: options.tags,
      hitsPerPage: options.limit,
    });
    const { value, cached: fromCache } = await cached(`hn:${url}`, async () => {
      const { data } = await fetchJson<{
        nbHits?: number;
        hits?: Array<{
          objectID: string;
          title?: string;
          url?: string;
          author?: string;
          points?: number;
          num_comments?: number;
          created_at?: string;
          story_text?: string;
        }>;
      }>(url);
      const results = (data.hits ?? []).map((hit) => ({
        id: hit.objectID,
        title: hit.title ?? '(sin título)',
        url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author ?? null,
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
        createdAt: hit.created_at ?? null,
        discussion: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      }));
      return { total: data.nbHits ?? results.length, results };
    });
    return { ...value, cached: fromCache, provider: 'hackernews', query: options.q };
  },
};

/* -------------------------------- DuckDuckGo ------------------------------ */

export interface WebResult {
  title: string;
  url: string;
  description: string;
  source: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function stripHtml(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function unwrapDuckDuckGoLink(href: string): string {
  try {
    const url = new URL(decodeEntities(href), 'https://duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.toString();
  } catch {
    return href;
  }
}

export const duckduckgo = {
  async web(options: { q: string; limit: number; site?: string; region?: string }): Promise<{ results: WebResult[]; total: number; provider: string; query: string; cached: boolean }> {
    const query = options.site ? `site:${options.site} ${options.q}` : options.q;
    const url = withQuery(config.providers.duckduckgo, '/html/', { q: query, kl: options.region });

    const { value, cached: fromCache } = await cached(`ddg:${url}`, async () => {
      const { text, status } = await fetchText(url, { timeoutMs: 8000, maxBytes: 2 * 1024 * 1024 });
      if (status >= 400) {
        throw ApiError.provider(`DuckDuckGo respondió ${status}.`, { status });
      }
      const results: WebResult[] = [];
      const blocks = text.split(/<div[^>]+class="[^"]*result[^"]*results_links[^"]*"[^>]*>/i).slice(1);
      for (const block of blocks) {
        const link = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
        if (!link) continue;
        const snippet = /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i.exec(block);
        results.push({
          title: stripHtml(link[2] ?? ''),
          url: unwrapDuckDuckGoLink(link[1] ?? ''),
          description: snippet ? stripHtml(snippet[1] ?? '') : '',
          source: new URL(unwrapDuckDuckGoLink(link[1] ?? 'https://duckduckgo.com')).hostname.replace(/^www\./, ''),
        });
        if (results.length >= options.limit) break;
      }
      if (results.length === 0) {
        throw ApiError.provider('DuckDuckGo devolvió una página sin resultados analizables (posible bloqueo temporal).', {
          provider: 'duckduckgo',
        });
      }
      return { results, total: results.length, provider: 'duckduckgo', query: options.q };
    });
    return { ...value, cached: fromCache };
  },
};
