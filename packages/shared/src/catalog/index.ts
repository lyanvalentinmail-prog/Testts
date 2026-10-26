import type {
  CatalogStats,
  CategoryId,
  CategoryDef,
  CanvasDef,
  EndpointDef,
  HttpMethod,
  ParamDef,
  ParamValue,
} from '../types.js';
import { CANVAS_GROUPS } from '../types.js';
import { CATEGORIES, CATEGORY_BY_ID } from './categories.js';
import { ANIME_ENDPOINTS } from './anime.js';
import { SEARCH_ENDPOINTS } from './search.js';
import { DOWNLOAD_ENDPOINTS } from './download.js';
import { UTILIDADES_ENDPOINTS } from './utilidades.js';
import { SISTEMA_ENDPOINTS } from './sistema.js';
import { CANVASES, CANVAS_BY_SLUG } from './canvas.js';

export { CATEGORIES, CATEGORY_BY_ID } from './categories.js';
export { CANVASES, CANVAS_BY_SLUG, SPECIAL_CANVASES, CANVAS_EFFECTS } from './canvas.js';
export { param, textParam, imageParam, queryParam } from './params.js';
export * from './validate.js';

/** Convierte una definición de canvas en un endpoint documentado. */
function canvasEndpoint(canvas: CanvasDef): EndpointDef {
  const imageParams = canvas.params.filter((p) => p.type === 'image');
  const isAnimated = canvas.slug === 'bratvideo' || canvas.slug === 'attp';
  const maxWidth = Math.max(...canvas.params.filter((p) => p.name === 'width').map((p) => Number(p.maximum ?? 2048)));
  const maxHeight = Math.max(...canvas.params.filter((p) => p.name === 'height').map((p) => Number(p.maximum ?? 2048)));

  const bodyExample: Record<string, string> = {};
  for (const p of imageParams) bodyExample[p.name] = 'data:image/png;base64,iVBORw0KGgo...';

  return {
    id: `canvas.${canvas.slug}`,
    name: `Canvas ${canvas.title}`,
    category: 'canvas',
    method: 'GET',
    path: `/api/canvas/${canvas.slug}`,
    summary: canvas.description,
    description: `${canvas.description} Se compone sobre la plantilla original «${canvas.origin.file}» (${canvas.width}×${canvas.height} px) procedente de la carpeta «${canvas.origin.drive}» de Google Drive. El resultado se rasteriza en el servidor con resvg y se devuelve como imagen.`,
    tags: ['canvas', canvas.group, CANVAS_GROUPS[canvas.group].label.toLowerCase()],
    auth: 'none',
    params: canvas.params,
    ...(imageParams.length
      ? {
          altMethods: ['POST'] as HttpMethod[],
          requestBody: {
            contentType: 'application/json',
            required: false,
            description:
              'Alternativa a la query string para enviar imágenes locales en base64 (data URI). El cuerpo puede incluir cualquier parámetro de la query como campo JSON.',
            example: bodyExample,
          },
        }
      : {}),
    responses: [
      {
        status: 200,
        description: isAnimated
          ? 'SVG animado (o PNG del fotograma con `format=png`).'
          : 'Imagen generada en el formato solicitado (PNG por defecto).',
        kind: 'image',
      },
      { status: 400, description: 'Parámetros inválidos (texto vacío, color no válido, tamaño fuera de rango).', kind: 'json' },
      { status: 413, description: 'La imagen enviada supera el límite de 8 MB.', kind: 'json' },
      { status: 422, description: 'La imagen remota no se pudo descargar o no es válida (se usa un marcador de posición).', kind: 'json' },
      { status: 429, description: 'Demasiadas peticiones por minuto desde tu IP.', kind: 'json' },
      { status: 500, description: 'Fallo inesperado al renderizar la plantilla.', kind: 'json' },
    ],
    examples: [
      {
        label: 'Valores por defecto',
        description: 'Todos los parámetros con los valores de ejemplo del catálogo.',
        params: Object.fromEntries(
          canvas.params
            .filter((p) => p.in === 'query' && p.example !== undefined && p.example !== '')
            .map((p) => [p.name, p.example as ParamValue])
        ),
      },
      ...(imageParams.length
        ? [
            {
              label: 'Subir imagen local (POST)',
              description: 'Envía el archivo como data URI en el cuerpo JSON.',
              body: bodyExample,
            },
          ]
        : []),
    ],
    notes: [
      `Plantilla original: ${canvas.origin.drive}/${canvas.origin.file}.`,
      `Tamaño máximo de salida: ${maxWidth}×${maxHeight} px.`,
      'La imagen se genera al vuelo y no se almacena en el servidor.',
    ],
    output: 'image',
    featured: canvas.featured ?? false,
    latency: 'rápido',
    canvas: {
      slug: canvas.slug,
      title: canvas.title,
      group: canvas.group,
      template: canvas.template,
      width: canvas.width,
      height: canvas.height,
      preview: `/api/canvas/${canvas.slug}/preview`,
      animated: isAnimated,
    },
    source: {
      name: 'Google Drive · CategoriaCanvas',
      url: 'https://drive.google.com',
      note: `Plantilla ${canvas.origin.file} copiada sin modificaciones al repositorio.`,
    },
  };
}

export const CANVAS_ENDPOINTS: EndpointDef[] = CANVASES.map(canvasEndpoint);

export const ENDPOINTS: EndpointDef[] = [
  ...SISTEMA_ENDPOINTS,
  ...CANVAS_ENDPOINTS,
  ...ANIME_ENDPOINTS,
  ...SEARCH_ENDPOINTS,
  ...DOWNLOAD_ENDPOINTS,
  ...UTILIDADES_ENDPOINTS,
];

export const ENDPOINTS_BY_ID = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e])) as Record<string, EndpointDef>;

export const STATS: CatalogStats = {
  endpoints: ENDPOINTS.length,
  categories: CATEGORIES.length,
  canvases: CANVASES.length,
  imageEndpoints: ENDPOINTS.filter((e) => e.output === 'image').length,
};

export function endpointById(id: string): EndpointDef | undefined {
  return ENDPOINTS_BY_ID[id];
}

export function endpointsByCategory(category: CategoryId): EndpointDef[] {
  return ENDPOINTS.filter((e) => e.category === category);
}

export function categoryWithCounts(): Array<CategoryDef & { count: number }> {
  return [...CATEGORIES]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ ...category, count: endpointsByCategory(category.id).length }));
}

/** Búsqueda simple por texto, categoría y método. */
export function searchEndpoints(options: {
  q?: string;
  category?: string;
  method?: string;
  limit?: number;
}): EndpointDef[] {
  const term = (options.q ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const limit = options.limit ?? ENDPOINTS.length;

  return ENDPOINTS.filter((endpoint) => {
    if (options.category && endpoint.category !== options.category) return false;
    if (options.method && endpoint.method !== options.method.toUpperCase()) return false;
    if (!term) return true;
    const haystack = [endpoint.name, endpoint.path, endpoint.summary, endpoint.description, endpoint.category, ...(endpoint.tags ?? [])]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return haystack.includes(term);
  }).slice(0, limit);
}

/** Parámetros de un endpoint agrupados para los formularios del explorador. */
export function groupedParams(params: ParamDef[]): Array<{ group: string; params: ParamDef[] }> {
  const groups = new Map<string, ParamDef[]>();
  for (const param of params) {
    const group = param.group ?? (param.in === 'path' ? 'Contenido' : 'Opciones');
    const list = groups.get(group) ?? [];
    list.push(param);
    groups.set(group, list);
  }
  return [...groups.entries()].map(([group, list]) => ({ group, params: list }));
}

export function canvasBySlug(slug: string): CanvasDef | undefined {
  return CANVAS_BY_SLUG[slug];
}

export const FEATURED_ENDPOINTS = ENDPOINTS.filter((e) => e.featured);

export { CANVAS_GROUPS };
