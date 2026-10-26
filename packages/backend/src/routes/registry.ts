/**
 * Manifiesto de handlers registrados.
 *
 * Express no permite enumerar rutas de forma fiable, así que mantenemos esta
 * lista explícita. Los tests comparan el manifiesto con el catálogo para evitar
 * endpoints documentados sin implementar (o implementados sin documentar).
 */
import { CANVASES, ENDPOINTS, ENDPOINTS_BY_ID } from '@velora/shared';

const STATIC_IDS = [
  'system.health',
  'system.stats',
  'system.categories',
  'system.endpoints',
  'system.endpoint',
  'system.openapi',
  'system.canvases',
  'system.template',
  'system.echo',

  'anime.search',
  'anime.get',
  'anime.manga',
  'anime.characters',
  'anime.character',
  'anime.waifu',
  'anime.maid',
  'anime.gacha',
  'anime.avatar',
  'anime.seasonal',
  'anime.schedule',
  'anime.top',
  'anime.characterImage',

  'search.web',
  'search.images',
  'search.lyrics',
  'search.wikipedia',
  'search.github',
  'search.books',
  'search.itunes',
  'search.news',
  'search.emoji',
  'search.countries',
  'search.catalog',

  'download.image',
  'download.file',
  'download.lyrics',
  'download.qr',
  'download.metadata',
  'download.gallery',
  'download.photo',
  'download.providers',

  'utils.uuid',
  'utils.password',
  'utils.hash',
  'utils.base64',
  'utils.slug',
  'utils.color',
  'utils.text',
  'utils.morse',
  'utils.random',
  'utils.date',
  'utils.notes.list',
  'utils.notes.create',
  'utils.notes.get',
  'utils.notes.update',
  'utils.notes.delete',
];

export function registeredRouteIds(): string[] {
  return [...STATIC_IDS, ...CANVASES.map((canvas) => `canvas.${canvas.slug}`)];
}

export function verifyCatalogCoverage(): {
  ok: boolean;
  missing: string[];
  extra: string[];
} {
  const registered = new Set(registeredRouteIds());
  const missing = ENDPOINTS.filter((endpoint) => !registered.has(endpoint.id)).map((endpoint) => endpoint.id);
  const extra = [...registered].filter((id) => !ENDPOINTS_BY_ID[id]);
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}
