# Catálogo de endpoints

Generado desde `packages/shared` el 2026-10-26. **94 endpoints** en 6 categorías (38 canvas).

| Categoría | Endpoints |
| --- | --- |
| [Canvas](#canvas) | 38 |
| [Anime](#anime) | 13 |
| [Search](#search) | 11 |
| [Download](#download) | 8 |
| [Utilidades](#utilidades) | 15 |
| [Sistema](#sistema) | 9 |

## Canvas

Composiciones gráficas sobre las plantillas originales de la carpeta «CategoriaCanvas» de Google Drive: carteles, tarjetas de perfil, chats, banners, avatares y efectos. Se renderizan en el servidor con SVG + resvg y se pueden descargar en PNG, JPEG, WebP o SVG.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/canvas/brat` | Canvas Brat | image | 9 |
| `GET` | `/api/canvas/bratwebp` | Canvas Brat transparente (WebP) | image | 10 |
| `GET` | `/api/canvas/bratestirado` | Canvas Brat estirado | image | 9 |
| `GET` | `/api/canvas/ttp` | Canvas TTP — texto a imagen | image | 9 |
| `GET` | `/api/canvas/absolutecinema` | Canvas Absolute Cinema | image | 9 |
| `GET` | `/api/canvas/bratanime` | Canvas Anime con cartel | image | 10 |
| `GET` | `/api/canvas/bratcoyote` | Canvas Coyote con cartel | image | 10 |
| `GET` | `/api/canvas/bratpinguino` | Canvas Pingüino con pancarta | image | 10 |
| `GET` | `/api/canvas/sebusca` | Canvas Se busca | image | 11 |
| `GET` | `/api/canvas/pokemoncard` | Canvas Carta Pokémon | image | 11 |
| `GET` | `/api/canvas/minions` | Canvas Minions con caras | image | 11 |
| `GET` | `/api/canvas/ship` | Canvas Ship | image | 9 |
| `GET` | `/api/canvas/friendship` | Canvas Best Friends | image | 10 |
| `GET` | `/api/canvas/gaycard` | Canvas Gay card | image | 8 |
| `GET` | `/api/canvas/quotly` | Canvas Quotly | image | 12 |
| `GET` | `/api/canvas/storyreply` | Canvas Story reply | image | 11 |
| `GET` | `/api/canvas/cuentatiktok` | Canvas Cuenta de TikTok | image | 10 |
| `GET` | `/api/canvas/iqc` | Canvas IQC — chat falso | image | 11 |
| `GET` | `/api/canvas/banner` | Canvas Banner de perfil | image | 10 |
| `GET` | `/api/canvas/fotopc` | Canvas Foto PC | image | 10 |
| `GET` | `/api/canvas/canvaimagen` | Canvas Canva imagen | image | 10 |
| `GET` | `/api/canvas/canvatextoxd` | Canvas Canva texto 3D | image | 10 |
| `GET` | `/api/canvas/imagencanba` | Canvas Imagen en Canva | image | 10 |
| `GET` | `/api/canvas/bobesponja` | Canvas Bob Esponja cartel | image | 10 |
| `GET` | `/api/canvas/bobesponja2` | Canvas Cómic de 4 viñetas | image | 10 |
| `GET` | `/api/canvas/bobesponja3` | Canvas Bob Esponja tarjeta | image | 10 |
| `GET` | `/api/canvas/storyreply-fondo` | Canvas Historia personalizada | image | 10 |
| `GET` | `/api/canvas/gay` | Canvas Filtro arcoíris | image | 10 |
| `GET` | `/api/canvas/invert` | Canvas Invertir colores | image | 10 |
| `GET` | `/api/canvas/fotopredeterminada` | Canvas Foto de perfil | image | 10 |
| `GET` | `/api/canvas/fotoshipgirlpred` | Canvas Foto ship predeterminada | image | 10 |
| `GET` | `/api/canvas/rata` | Canvas Rata | image | 10 |
| `GET` | `/api/canvas/galletita` | Canvas Galletita | image | 10 |
| `GET` | `/api/canvas/pan` | Canvas Pan | image | 10 |
| `GET` | `/api/canvas/banana` | Canvas Banana | image | 10 |
| `GET` | `/api/canvas/arandano` | Canvas Arándano | image | 10 |
| `GET` | `/api/canvas/bratvideo` | Canvas Brat animado | image | 10 |
| `GET` | `/api/canvas/attp` | Canvas ATTP animado | image | 9 |

## Anime

Búsquedas reales de anime, manga y personajes con la API pública de MyAnimeList (Jikan), más un elenco local curado para gacha, waifus, citas y avatares generados. Jikan no requiere clave.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/anime/search` | Buscar anime | json | 8 |
| `GET` | `/api/anime/anime/{id}` | Detalle de anime | json | 1 |
| `GET` | `/api/anime/manga` | Buscar manga | json | 4 |
| `GET` | `/api/anime/characters` | Buscar personajes | json | 3 |
| `GET` | `/api/anime/character/random` | Personaje aleatorio | json | 2 |
| `GET` | `/api/anime/waifu` | Waifu aleatoria | json | 2 |
| `GET` | `/api/anime/maid` | Maid aleatoria | json | 1 |
| `GET` | `/api/anime/gacha` | Gacha de personajes | json | 2 |
| `GET` | `/api/anime/avatar` | Avatar generado | image | 4 |
| `GET` | `/api/anime/seasonal` | Anime de temporada | json | 3 |
| `GET` | `/api/anime/schedule` | Calendario semanal | json | 2 |
| `GET` | `/api/anime/top` | Top de anime y manga | json | 4 |
| `GET` | `/api/anime/character-image` | Imagen de personaje | image | 2 |

## Search

Búsqueda web, imágenes con licencia abierta, letras, Wikipedia, GitHub, libros, noticias, emojis y países. Cada endpoint declara su proveedor, sus límites y su alternativa cuando el proveedor no responde.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/search/web` | Búsqueda web | json | 4 |
| `GET` | `/api/search/images` | Búsqueda de imágenes | json | 5 |
| `GET` | `/api/search/lyrics` | Búsqueda de letras | json | 2 |
| `GET` | `/api/search/wikipedia` | Búsqueda en Wikipedia | json | 3 |
| `GET` | `/api/search/github` | Búsqueda de repositorios | json | 5 |
| `GET` | `/api/search/books` | Búsqueda de libros | json | 5 |
| `GET` | `/api/search/itunes` | Búsqueda en iTunes | json | 4 |
| `GET` | `/api/search/news` | Búsqueda de noticias técnicas | json | 4 |
| `GET` | `/api/search/emoji` | Búsqueda de emojis | json | 5 |
| `GET` | `/api/search/countries` | Búsqueda de países | json | 4 |
| `GET` | `/api/search/endpoints` | Buscar dentro de la API | json | 4 |

## Download

Descarga de archivos e imágenes públicas con protección SSRF y límites de tamaño, letras sincronizadas de LRCLIB, metadatos de páginas y galería de fotos incluida. Solo fuentes públicas y autorizadas.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/download/image` | Descargar imagen | image | 3 |
| `GET` | `/api/download/file` | Descargar archivo | file | 3 |
| `GET` | `/api/download/lyrics` | Letra de canción | json | 3 |
| `GET` | `/api/download/qr` | Código QR | image | 7 |
| `GET` | `/api/download/metadata` | Metadatos de una página | json | 1 |
| `GET` | `/api/download/gallery` | Galería de fotos | json | 2 |
| `GET` | `/api/download/photo/{id}` | Foto de la galería | image | 4 |
| `GET` | `/api/download/providers` | Estado de proveedores | json | — |

## Utilidades

UUID, contraseñas, hashes, Base64, slugs, colores, texto, fechas por zona horaria y un almacén temporal para probar los métodos POST, PUT y DELETE. Todo se ejecuta en el servidor sin dependencias externas.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/utils/uuid` | Generar UUID | json | 3 |
| `GET` | `/api/utils/password` | Generar contraseña | json | 5 |
| `GET` | `/api/utils/hash` | Hash de texto | json | 2 |
| `GET` | `/api/utils/base64` | Base64 | json | 3 |
| `GET` | `/api/utils/slug` | Slug | json | 3 |
| `GET` | `/api/utils/color` | Información de color | json | 2 |
| `GET` | `/api/utils/text` | Transformar texto | json | 2 |
| `GET` | `/api/utils/morse` | Código Morse | json | 2 |
| `GET` | `/api/utils/random` | Números aleatorios | json | 5 |
| `GET` | `/api/utils/date` | Fecha y hora | json | 2 |
| `GET` | `/api/utils/notes` | Listar notas | json | 2 |
| `POST` | `/api/utils/notes` | Crear nota | json | — |
| `GET` | `/api/utils/notes/{id}` | Obtener nota | json | 1 |
| `PUT` | `/api/utils/notes/{id}` | Actualizar nota | json | 1 |
| `DELETE` | `/api/utils/notes/{id}` | Eliminar nota | json | 1 |

## Sistema

Endpoints de introspección de la plataforma: estado del servidor, métricas en memoria, catálogo navegable, búsqueda de endpoints y especificación OpenAPI 3.1 generada desde el mismo catálogo.

| Método | Ruta | Nombre | Salida | Parámetros |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | Estado del servidor | json | — |
| `GET` | `/api/stats` | Métricas en memoria | json | — |
| `GET` | `/api/categories` | Categorías | json | — |
| `GET` | `/api/endpoints` | Catálogo de endpoints | json | 5 |
| `GET` | `/api/endpoints/{id}` | Detalle de endpoint | json | 1 |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 | json | 1 |
| `GET` | `/api/canvas` | Índice de canvas | json | 1 |
| `GET` | `/api/canvas/{slug}/preview` | Vista previa de plantilla | image | 2 |
| `GET` | `/api/echo` | Echo de petición | json | 1 |

## Notas

- Una especificación OpenAPI 3.1 completa está en [openapi.json](./openapi.json) y [openapi.yaml](./openapi.yaml).
- Las plantillas de los 38 canvas proceden de la carpeta «CategoriaCanvas» de Google Drive y viven en `packages/backend/assets/canvas`.
- Los ejemplos de respuesta del frontend se guardan en `packages/frontend/src/lib/examples.ts`.
