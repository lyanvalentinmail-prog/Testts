import type { CategoryDef } from '../types.js';

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'canvas',
    name: 'Canvas',
    slug: 'canvas',
    tagline: 'Genera imágenes con plantillas reales',
    description:
      'Composiciones gráficas sobre las plantillas originales de la carpeta «CategoriaCanvas» de Google Drive: carteles, tarjetas de perfil, chats, banners, avatares y efectos. Se renderizan en el servidor con SVG + resvg y se pueden descargar en PNG, JPEG, WebP o SVG.',
    icon: 'palette',
    accent: '#8b5cf6',
    order: 1,
    featured: true,
  },
  {
    id: 'anime',
    name: 'Anime',
    slug: 'anime',
    tagline: 'Series, personajes, gacha y avatares',
    description:
      'Búsquedas reales de anime, manga y personajes con la API pública de MyAnimeList (Jikan), más un elenco local curado para gacha, waifus, citas y avatares generados. Jikan no requiere clave.',
    icon: 'sparkles',
    accent: '#f472b6',
    order: 2,
    featured: true,
  },
  {
    id: 'search',
    name: 'Search',
    slug: 'search',
    tagline: 'Búsquedas federadas y datasets',
    description:
      'Búsqueda web, imágenes con licencia abierta, letras, Wikipedia, GitHub, libros, noticias, emojis y países. Cada endpoint declara su proveedor, sus límites y su alternativa cuando el proveedor no responde.',
    icon: 'search',
    accent: '#22d3ee',
    order: 3,
    featured: true,
  },
  {
    id: 'download',
    name: 'Download',
    slug: 'download',
    tagline: 'Descargas y metadatos de recursos',
    description:
      'Descarga de archivos e imágenes públicas con protección SSRF y límites de tamaño, letras sincronizadas de LRCLIB, metadatos de páginas y galería de fotos incluida. Solo fuentes públicas y autorizadas.',
    icon: 'download',
    accent: '#34d399',
    order: 4,
    featured: true,
  },
  {
    id: 'utilidades',
    name: 'Utilidades',
    slug: 'utilidades',
    tagline: 'Herramientas de desarrollo',
    description:
      'UUID, contraseñas, hashes, Base64, slugs, colores, texto, fechas por zona horaria y un almacén temporal para probar los métodos POST, PUT y DELETE. Todo se ejecuta en el servidor sin dependencias externas.',
    icon: 'wrench',
    accent: '#fbbf24',
    order: 5,
    featured: true,
  },
  {
    id: 'sistema',
    name: 'Sistema',
    slug: 'sistema',
    tagline: 'Salud, catálogo y OpenAPI',
    description:
      'Endpoints de introspección de la plataforma: estado del servidor, métricas en memoria, catálogo navegable, búsqueda de endpoints y especificación OpenAPI 3.1 generada desde el mismo catálogo.',
    icon: 'activity',
    accent: '#60a5fa',
    order: 6,
    featured: false,
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<string, CategoryDef>;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
