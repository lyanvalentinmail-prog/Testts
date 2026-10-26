# Velora API

Plataforma de catálogo, documentación interactiva y pruebas en vivo de una API REST real:
**generación de imágenes con plantillas originales de Google Drive**, datos de anime, búsquedas
federadas, descargas seguras y utilidades para desarrolladores.

> **Estado real del proyecto:** 94 endpoints implementados y documentados, 38 canvas con sus
> plantillas originales, 6 categorías, 29 tests automatizados y build de producción verificado en
> local. No se ha desplegado en Render ni en Vercel desde este entorno; las instrucciones y los
> archivos de configuración están incluidos y son los que se usaron para probar el arranque en modo
> producción (`NODE_ENV=production node dist/server.js`). El `vercel.json` usa el modo **services**
> (backend + frontend en un solo proyecto) y se validó contra el esquema oficial de Vercel.

<table>
<tr><td><b>Endpoints</b></td><td><b>Canvas</b></td><td><b>Categorías</b></td><td><b>Tests</b></td></tr>
<tr><td>94</td><td>38</td><td>6</td><td>21 API + 8 web</td></tr>
</table>

---

## Índice

1. [Qué incluye](#qué-incluye)
2. [Stack](#stack)
3. [Estructura del repositorio](#estructura-del-repositorio)
4. [Inicio rápido](#inicio-rápido)
5. [Scripts](#scripts)
6. [Variables de entorno](#variables-de-entorno)
7. [La API](#la-api)
8. [Sistema de canvas](#sistema-de-canvas)
9. [El explorador web](#el-explorador-web)
10. [Añadir endpoints, categorías y canvas](#añadir-endpoints-categorías-y-canvas)
11. [Tests y verificación](#tests-y-verificación)
12. [Despliegue](#despliegue)
13. [Seguridad](#seguridad)
14. [Ejemplos reales de petición y respuesta](#ejemplos-reales-de-petición-y-respuesta)
15. [Limitaciones y transparencia](#limitaciones-y-transparencia)
16. [Solución de problemas](#solución-de-problemas)
17. [Créditos y licencias](#créditos-y-licencias)

---

## Qué incluye

| Categoría | Endpoints | Contenido |
| --- | ---: | --- |
| **Canvas** | 38 | Composiciones sobre plantillas reales: carteles BRAT, tarjetas de cita, chats, minions, Pokémon, banners, avatares calculados, efectos y dos canvas animados. |
| **Anime** | 13 | Búsqueda de anime y manga, personajes, elenco local (waifu, maid, gacha), avatares SVG/PNG, temporadas, horarios, rankings e imágenes. |
| **Search** | 11 | Web, imágenes con licencia abierta, letras, Wikipedia, GitHub, libros, iTunes, Hacker News, emojis (1.870), países (250) y buscador del propio catálogo. |
| **Download** | 8 | Descarga de imágenes y archivos públicos, letras en JSON/LRC/TXT, códigos QR, metadatos Open Graph, galería incluida y diagnóstico de proveedores. |
| **Utilidades** | 15 | UUID v4/v7, contraseñas, hashes, Base64, slugs, colores, texto, Morse, aleatorios con semilla, fechas por zona horaria y CRUD de notas. |
| **Sistema** | 9 | Health con comprobación de assets, métricas, categorías, catálogo filtrable, detalle de endpoint, OpenAPI 3.1 y eco de la petición. |

Capacidades transversales:

- **Documentación por endpoint** con nombre, descripción, método, ruta, autenticación, parámetros
  (tipo, obligatoriedad, default, reglas), cuerpo de la petición, códigos de estado y ejemplos.
- **Consola integrada**: formularios generados desde el catálogo, envío real de la petición,
  respuesta embellecida, estado HTTP, tiempo, tamaño, cabeceras, copia de URL y de código
  (cURL, JavaScript, Python), previsualización y descarga de imágenes.
- **Canvas modulares**: registro declarativo con zonas (coordenadas, forma, color, tipografía,
  imagen), subida de archivos locales vía `POST multipart`, `format`, tamaño y descarga.
- **Búsqueda global** (⌘K / `/`), filtros por categoría y método, contadores calculados desde el
  catálogo, navegación responsive y estados de carga/error.
- **Seguridad**: validación estricta, límites de subida, restricción de tipos, rate limiting,
  protección SSRF, CORS configurable y secretos solo por entorno.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, lucide-react |
| Backend | Node 22, TypeScript 5.9, Express 5, helmet, cors, multer, sharp, @resvg/resvg-js, qrcode |
| Compartido | Paquete `@velora/shared` con tipos y el catálogo (fuente única de verdad) |
| Pruebas | `node:test` + `tsx` (backend) y Vitest (frontend) |
| Build | esbuild (API) y Vite (web), sin archivos temporales persistentes |

El catálogo compartido genera la documentación, los formularios, el OpenAPI, los contadores y la
búsqueda. No hay listas duplicadas de endpoints: si un endpoint está en el catálogo, se documenta,
se cuenta y se puede probar.

---

## Estructura del repositorio

```
.
├── packages/
│   ├── shared/                    # @velora/shared: tipos + catálogo
│   │   └── src/
│   │       ├── types.ts
│   │       ├── catalog/
│   │       │   ├── categories.ts  # 6 categorías extensibles
│   │       │   ├── params.ts      # fábricas de parámetros
│   │       │   ├── canvas.ts      # 38 canvas con zonas medidas
│   │       │   ├── anime.ts  search.ts  download.ts  utilidades.ts  sistema.ts
│   │       │   ├── validate.ts    # coerce, validateParams, buildRequestUrl
│   │       │   └── index.ts       # ENDPOINTS, STATS, búsqueda, agrupación
│   │       └── index.ts
│   └── backend/
│       ├── src/
│       │   ├── config.ts          # toda la configuración por entorno
│       │   ├── app.ts  server.ts  dev.ts  vercel.ts
│       │   ├── routes/            # system, canvas, anime, search, download, utils
│       │   ├── middleware/        # seguridad, validación, errores
│       │   ├── canvases/          # motor de composición + casos especiales + animados
│       │   ├── services/          # proveedores externos, OpenAPI, notas
│       │   ├── lib/               # http seguro, imágenes, caché, rate limit, assets…
│       │   └── data/              # países, emojis y elenco local
│       ├── assets/
│       │   ├── canvas/            # 38 plantillas (33 de Drive + pósters) + vídeos
│       │   ├── fonts/             # DejaVu Sans / Mono + licencia
│       │   ├── photos/            # galería con metadatos
│       │   └── defaults/          # avatares por defecto
│       ├── scripts/               # build, templates, openapi, smoke
│       └── tests/                 # catalog.test.ts, api.test.ts
├── packages/frontend/
│   ├── src/
│   │   ├── components/            # Layout, Sidebar, Playground, ParamField, JsonView…
│   │   ├── pages/                 # Home, Endpoints, Category, Canvas, Endpoint, Guide
│   │   ├── lib/                   # api, ejemplos, hooks, estilos
│   │   └── App.tsx  main.tsx
│   ├── public/                    # favicon + banner OG
│   └── vite.config.ts
├── docs/
│   ├── openapi.json               # OpenAPI 3.1 generado
│   ├── openapi.yaml
│   └── ENDPOINTS.md               # tabla navegable del catálogo
├── render.yaml                    # Render: un solo servicio (web + API)
├── vercel.json                    # Vercel: servicios backend + frontend
├── .env.example
└── README.md
```

---

## Inicio rápido

Requisitos: **Node.js ≥ 20.11** (probado con 22.22.3) y npm ≥ 10.

```bash
git clone https://github.com/lyanvalentinmail-prog/Testts.git
cd Testts

npm install
npm run dev          # API en http://localhost:4000 · web en http://localhost:5173
```

Abre `http://localhost:5173`. Vite hace proxy de `/api` hacia el backend, así que no hay problemas
de CORS en desarrollo.

Modo producción en un solo proceso:

```bash
npm run build        # API (esbuild) + web (Vite)
npm start            # http://localhost:4000 sirve la web y la API
```

Comprobación rápida sin abrir el navegador:

```bash
curl -s http://localhost:4000/api/health | jq
curl -s "http://localhost:4000/api/canvas/brat?text=Hola&formato=png" -o brat.png
npm test             # 21 tests de API + 8 de frontend
npm run smoke        # 12 comprobaciones contra una instancia real
```

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | API con recarga (`tsx watch`) + Vite en paralelo. |
| `npm run dev:api` / `npm run dev:web` | Solo backend / solo frontend. |
| `npm run build` | Compila la API en `packages/backend/dist` y la web en `packages/frontend/dist`. |
| `npm run build:api` / `npm run build:web` | Builds individuales. |
| `npm start` | Arranca el servidor Node compilado y sirve la web si existe. |
| `npm test` | Tests de backend (`node:test`) y frontend (Vitest). |
| `npm run test:api` / `npm run test:web` | Suites por separado. |
| `npm run typecheck` | TypeScript estricto en todos los paquetes. |
| `npm run smoke` | Batería de peticiones reales contra un puerto efímero. |
| `npm run templates` | Verifica que las 38 plantillas existan y sus dimensiones coincidan. |
| `npm run openapi` | Regenera `docs/openapi.json`, `docs/openapi.yaml` y `docs/ENDPOINTS.md`. |

---

## Variables de entorno

Todas son opcionales para desarrollo. Copia `.env.example` a `.env` si necesitas cambiarlas.
El backend **no lee `.env` automáticamente**: usa variables del proceso o el gestor de secretos de
tu plataforma (Render/Vercel/Docker). Para cargarlas en local puedes usar `export $(grep -v '^#' .env | xargs)`
o un gestor como `direnv`.

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | Puerto e interfaz del servidor. Render inyecta `PORT`. |
| `NODE_ENV` | `development` | `production` activa CORS vacío por defecto y logs `info`. |
| `CORS_ORIGINS` | `*` en dev, vacío en prod | Orígenes permitidos, separados por comas. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana del rate limit. |
| `RATE_LIMIT_MAX` | `120` | Peticiones por ventana e IP. |
| `RATE_LIMIT_IMAGE_MAX` | `60` | Límite independiente para canvas/fotos. |
| `TRUST_PROXY` | `true` | Usa la IP real detrás de proxies. |
| `VELORA_API_KEY` | vacío | Si se define, exige `X-API-Key` (salvo health y OpenAPI). |
| `GITHUB_TOKEN` | vacío | Eleva el límite de la búsqueda de GitHub. |
| `HTTP_TIMEOUT_MS` | `9000` | Timeout de peticiones salientes. |
| `HTTP_MAX_BYTES` | `8 MB` | Tamaño máximo descargado de una URL externa. |
| `ALLOW_PRIVATE_TARGETS` | `false` | Solo pruebas con mocks locales; nunca en producción. |
| `UPLOAD_MAX_BYTES` | `8 MB` | Tamaño máximo de archivos subidos. |
| `CACHE_PROVIDER_TTL_MS` | `300000` | TTL de la caché de proveedores. |
| `SERVE_FRONTEND` | `true` (false con `VERCEL`) | Sirve la web compilada (modo Render de un servicio). |
| `FRONTEND_DIR` / `ASSETS_DIR` | rutas del repo | Rutas explícitas si el layout cambia. |
| `VITE_API_URL` | vacío | Solo para desplegar la web separada de la API. **No** se define en Vercel services: la web usa rutas relativas. |
| `OPENAPI_SERVER_URL` | `http://localhost:4000` | Servidor que se escribe en el OpenAPI generado. |

> **Nunca** pongas `VELORA_API_KEY` ni `GITHUB_TOKEN` en variables `VITE_*`: todo lo que empieza por
> `VITE_` se incrusta en el bundle público.

---

## La API

Base: `https://<tu-dominio>/api` (o `/api` en el mismo origen). Todas las rutas aceptan
`GET` salvo las de notas (`POST`, `PUT`, `DELETE`) y la variante `POST` de los canvas para subir
archivos.

### Sobre de respuesta

```json
{
  "success": true,
  "data": { "…": "resultado" },
  "meta": {
    "requestId": "4f2a9f0e-8c1b-4d3a-9b4e-3a6d1c2b7e90",
    "durationMs": 118,
    "cached": false,
    "timestamp": "2026-10-25T21:04:12.418Z"
  }
}
```

Los errores mantienen el sobre:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Hay parámetros inválidos en la petición.",
    "details": [{ "parameter": "text", "in": "query", "message": "es obligatorio" }],
    "hint": "Revisa los parámetros marcados en la documentación del endpoint."
  },
  "meta": { "requestId": "…", "durationMs": 0, "timestamp": "…" }
}
```

Códigos: `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `UPSTREAM_BLOCKED` (403), `NOT_FOUND` (404),
`METHOD_NOT_ALLOWED` (405), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415),
`VALIDATION_ERROR` (422), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), `PROVIDER_UNAVAILABLE` (502).

Cabeceras útiles: `X-Request-Id`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
`X-RateLimit-Reset`, `Retry-After`, `X-Velora-Cache`, `X-Velora-Canvas` y
`X-Velora-Dimensions`.

### Autenticación

Pública por defecto. Si defines `VELORA_API_KEY`, envía `X-API-Key: <clave>` (o
`Authorization: Bearer <clave>`) en todas las rutas salvo `/api/health` y `/api/openapi.json`.

### Alias en español

Los parámetros aceptan alias documentados: `texto` → `text`, `formato` → `format`,
`imagen`/`foto`/`url` → `image`, `buscar` → `q`, `algoritmo` → `algorithm`, etc. Los alias se
resuelven en la validación compartida, así que funcionan igual en la API y en los formularios.

### OpenAPI

`GET /api/openapi.json` (o `?format=yaml`) devuelve la especificación 3.1 generada desde el
catálogo. También está versionada en `docs/openapi.json` y `docs/openapi.yaml`.

---

## Sistema de canvas

Los canvas no son imágenes prefabricadas: el servidor compone un SVG con la plantilla original,
pinta las zonas declaradas (rectángulos, círculos, elipses), inserta imágenes con recorte
(`preserveAspectRatio="xMidYMid slice"`), ajusta el tamaño de la tipografía para que quepa y
rasteriza con **resvg** usando fuentes DejaVu incluidas (resultado determinista en cualquier
plataforma).

```bash
# Texto + color + tamaño
curl -s "http://localhost:4000/api/canvas/brat?texto=Hola%20Velora&formato=webp&width=512" -o hola.webp

# Imagen por URL
curl -s "http://localhost:4000/api/canvas/bratcoyote?text=HOLA&imagen=https://picsum.photos/400" -o coyote.png

# Archivo local (POST multipart)
curl -s "http://localhost:4000/api/canvas/minions" \
  -F "text=banana" -F "image=@cara1.png" -F "image2=@cara2.png" -o minions.png
```

- **Formatos**: `png` (por defecto), `jpeg`, `webp`, `svg`. Los animados (`bratvideo`, `attp`)
  aceptan `svg` (animación SMIL) y `png` (fotograma).
- **Tamaño**: hasta 2048×2048. El parámetro `download=true` fuerza `Content-Disposition: attachment`.
- **Subidas**: PNG/JPEG/WebP/GIF hasta 8 MB; se validan por magic bytes y se normalizan con sharp.
- **Plantillas**: 36 imágenes (34 originales de Drive y 2 pósters extraídos de los vídeos) más
  `bratvideo.mp4` y `attp.webm`. Cada canvas declara `origin.drive` y `origin.file`.
- **Sin estado**: nada se escribe en disco; la imagen vive en memoria durante la petición.

Verificación incluida:

```bash
npm run templates
# 38 canvas · 38 imágenes verificadas · 0 problemas
```

---

## El explorador web

| Pantalla | Contenido |
| --- | --- |
| `/` | Descripción de la plataforma, contadores reales, buscador, accesos por categoría, endpoints destacados, primeros canvas y quickstart. |
| `/endpoints` | Catálogo completo con búsqueda por nombre/ruta/descripción y filtros por categoría y método. |
| `/c/:categoría` | Cabecera de la categoría, galería de canvas (si aplica) y tarjetas de endpoints. |
| `/canvas` | Galería de las 38 plantillas, agrupadas, con búsqueda y filtros. |
| `/e/:id` | Documentación completa + consola de pruebas + código de ejemplo + respuesta de ejemplo. |
| `/docs` | Guía de uso, errores, autenticación, despliegue, seguridad y cómo ampliar la plataforma. |

Detalles de la consola (`Playground`):

- Formularios generados por grupos (`Contenido`, `Estilo`, `Salida`, `Filtros`) con controles
  adecuados: `select` para enums, sliders para rangos, color pickers, toggles, textareas y subida
  de archivos.
- Validación previa de campos obligatorios y errores del servidor humanizados (código, mensaje,
  pista y lista de parámetros implicados).
- Respuesta: JSON con resaltado, previsualización de imagen/vídeo, tamaño, tiempo, estado,
  cabeceras, URL enviada y descarga del binario.
- Copia de la URL de la petición y de ejemplos en cURL, JavaScript y Python generados con los
  valores actuales del formulario.
- Estado de la API en la cabecera (consulta `/api/health` cada 60 s).
- Búsqueda global con teclado (`⌘K` / `Ctrl+K` / `/`).

---

## Añadir endpoints, categorías y canvas

### Un endpoint nuevo

1. **Define** la entrada en `packages/shared/src/catalog/<categoría>.ts`:

```ts
{
  id: 'utils.reverse',
  name: 'Invertir texto',
  category: 'utilidades',
  method: 'GET',
  path: '/api/utils/reverse',
  summary: 'Devuelve el texto invertido carácter a carácter.',
  description: 'Invierte el orden de los caracteres respetando los emojis…',
  tags: ['texto'],
  auth: 'none',
  params: [textParam('text', 'hola')],
  responses: [
    { status: 200, description: 'Texto invertido.', kind: 'json' },
    { status: 422, description: 'Parámetros inválidos.', kind: 'json' },
  ],
  examples: [{ label: 'Hola', params: { text: 'hola' } }],
  output: 'json',
  latency: 'rápido',
}
```

2. **Registra** el handler en `packages/backend/src/routes/utils.ts`:

```ts
utilsRouter.get('/reverse', validateQuery('utils.reverse'), (req, res) => {
  const text = String(req.query_.text ?? '');
  ok(res, { input: text, output: [...text].reverse().join('') });
});
```

3. **Añade el id** a `packages/backend/src/routes/registry.ts` (el test compara manifiesto y
   catálogo) y, si quieres un ejemplo de respuesta en la web, a
   `packages/frontend/src/lib/examples.ts`.

4. **Verifica**: `npm run typecheck && npm test`. La documentación, el OpenAPI, los formularios y
   los contadores se actualizan solos.

### Una categoría nueva

Añade la entrada en `catalog/categories.ts` (`id`, `name`, `slug`, `tagline`, `description`,
`icon`, `accent`, `order`), amplía `CategoryId` en `types.ts` y registra el color en
`packages/frontend/src/lib/ui.ts`. La barra lateral, la portada y los filtros se generan desde ahí.

### Un canvas nuevo

1. Copia la plantilla a `packages/backend/assets/canvas/`.
2. Añade su definición en `catalog/canvas.ts` con `width`, `height`, `origin` y `zones`.
3. Ejecuta `npm run templates` para comprobar que la plantilla existe y las dimensiones coinciden.

Cada canvas se convierte automáticamente en un endpoint documentado (`canvas.<slug>`), aparece en
la galería y obtiene formulario y vista previa.

---

## Tests y verificación

```bash
npm test
# backend: 21 tests (catálogo, validación, canvas, POST multipart, QR, SSRF, CRUD, OpenAPI)
# frontend: 8 tests (ejemplos, URL, métodos, snippets, formateadores)

npm run smoke
# 12/12 comprobaciones correctas

npm run templates
# 38 canvas · 38 imágenes verificadas · 0 problemas
```

Los tests del backend arrancan la app real en un puerto efímero y hacen peticiones HTTP: no hay
mocks del servidor. Se comprueba, entre otras cosas, que el PNG generado mide 736×736, que el POST
multipart con una imagen sintética devuelve una imagen válida, que la protección SSRF rechaza
`127.0.0.1` y que las notas se crean, leen, actualizan y eliminan.

> Los proveedores externos (Jikan, Openverse, LRCLIB, Wikipedia, GitHub, Open Library, iTunes,
> Hacker News, DuckDuckGo) **no eran accesibles desde el entorno de compilación** (salida a
> Internet restringida). Por eso los tests no dependen de ellos: usan datasets locales, canvas,
> utilidades y notas. En un despliegue con red normal funcionan, con caché de 5 minutos y errores
> 502 explícitos si el proveedor falla.

---

## Despliegue

### Render (recomendado, servicio único)

El `render.yaml` compila la web y la API y arranca un solo proceso Node que sirve ambas en el mismo
origen (sin CORS).

```yaml
buildCommand: npm ci && npm run build
startCommand: npm start
healthCheckPath: /api/health
```

Pasos:

1. Render → **New → Blueprint** → conecta el repositorio (detecta `render.yaml`).
2. Define si quieres `CORS_ORIGINS`, `VELORA_API_KEY` y `GITHUB_TOKEN` en el panel.
3. Deploy. La web queda en `https://<servicio>.onrender.com` y la API en `/api`.

Notas para el plan gratuito: el servicio se suspende por inactividad (primer arranque lento), la
memoria es limitada y **no hay disco persistente**. Por eso las notas y la caché viven en memoria y
se reinician con cada despliegue. Los canvas y descargas no necesitan disco.

### Vercel (proyecto con dos servicios)

El `vercel.json` de la raíz usa el modo **services** de Vercel: un solo proyecto, dos servicios y un
único dominio.

| Servicio | Raíz | Framework | Build | Papel |
| --- | --- | --- | --- | --- |
| `backend` | `packages/backend` | `express` | `npm run build` → `dist/vercel.js`, entrypoint `api/index.mjs` | API interna, expuesta solo bajo `/api/*` |
| `frontend` | `packages/frontend` | `vite` | `npm run build` → `dist` | web pública en `/` |

Enrutado público (de lo más específico a lo más general):

1. `/api/(.*)` y `/api` → servicio `backend`. La ruta se conserva, y la API ya está montada bajo `/api`.
2. `/assets/(.*)`, `/favicon.svg` y `/og-banner.jpg` → servicio `frontend` (estáticos con hash).
3. `/(.*)` → servicio `frontend` seleccionando `/index.html`, que es el fallback de la SPA: rutas como
   `/endpoints`, `/canvas` o `/e/anime.search` se recargan sin 404.

Pasos:

1. Importa el repositorio en Vercel y **no** definas Root Directory ni Framework Preset: el
   `vercel.json` de la raíz describe los dos servicios.
2. **No** definas `VITE_API_URL` ni `VITE_API_TARGET`. La web llama a rutas relativas (`/api/...`) y
   Vercel las enruta al servicio backend en el mismo dominio, así que no hay CORS de por medio.
3. Variables opcionales del proyecto: `VELORA_API_KEY`, `GITHUB_TOKEN`, `CORS_ORIGINS` (solo si vas a
   llamar a la API desde otro origen), `RATE_LIMIT_MAX`, `RATE_LIMIT_IMAGE_MAX`.
4. Deploy. Vercel instala el monorepo con npm workspaces y compila cada servicio por separado.

Detalles técnicos de esta configuración:

- El `entrypoint` del backend es `api/index.mjs`, un archivo que **sí** está en el repositorio
  (Vercel resuelve el entrypoint antes de compilar y rechaza rutas que aún no existen). Ese archivo
  reexporta `dist/vercel.js`, el handler que genera `npm run build` con esbuild.
- `SERVE_FRONTEND` se desactiva automáticamente cuando existe `VERCEL`: el servicio backend no intenta
  servir la web, porque de eso se encarga el servicio `frontend`.
- Las 38 plantillas, las fuentes y las fotos viajan con la función gracias a
  `functions["dist/vercel.js"].includeFiles = "assets/**"`. En tiempo de ejecución el backend busca
  `assets/` en varias rutas (`ASSETS_DIR`, `cwd`, la ruta del bundle), así que funciona igual en local,
  en Render y dentro de la función.
- `maxDuration: 30` y `memory: 1024` para el backend. En el plan Hobby el máximo real de ejecución
  puede ser menor; las descargas grandes o los canvas más pesados pueden agotarlo.
- `sharp` y `@resvg/resvg-js` son módulos nativos: el build los deja externos y Vercel los incluye
  desde `node_modules` (linux-x64). Si el empaquetado fallara, Render sigue siendo la alternativa.
- **Sin bindings**: el servicio `frontend` es estático y habla con la API desde el navegador a través
  del rewrite público `/api`, no desde el servidor. Un binding solo inyectaría la URL interna del
  backend como variable de entorno de una función, y aquí no habría ningún proceso servidor que la
  leyera.

> **No se ejecutó `vercel deploy` desde este entorno.** La configuración se validó contra el esquema
> oficial de Vercel y los dos builds se compilaron en local, pero no hay una URL pública ni un
> despliegue real que mostrar. Tampoco se probó `vercel dev`.

### Docker (opcional)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=4000 SERVE_FRONTEND=true
EXPOSE 4000
CMD ["npm", "start"]
```

`sharp` y `@resvg/resvg-js` incluyen binarios precompilados para `linux-x64` (glibc y musl), por lo
que funcionan en la imagen oficial de Node y en Alpine.

---

## Seguridad

- **Validación** por tipo, rango, longitud, patrón y enumeración; los errores indican el campo y el
  motivo. Los alias también se validan.
- **Subidas** limitadas a 8 MB, tipos permitidos y verificación por magic bytes con sharp.
- **SSRF**: las URLs externas se resuelven (incluidas redirecciones) y se rechazan loopback,
  redes privadas, link-local, CGNAT, multicast, metadatos cloud y credenciales embebidas. Hay una
  prueba automatizada que lo verifica.
- **Rate limiting** por IP, con ventana y límites configurables y cabeceras estándar.
- **CORS** restrictivo en producción; los orígenes se declaran por entorno.
- **Secretos** solo en el servidor. El frontend nunca recibe claves; si activas `VELORA_API_KEY`,
  la web pública necesita un proxy propio para consumir la API.
- **Sin ejecución de código**: las utilidades operan sobre datos, no evalúan entrada.
- **Descargas** solo desde fuentes públicas permitidas, con allowlist de MIME y sin seguir a
  destinos internos. No se sirven archivos locales arbitrarios.

---

## Ejemplos reales de petición y respuesta

Capturados de la instancia local durante la verificación.

**Health**

```bash
curl -s http://localhost:4000/api/health
```

```json
{"success":true,"data":{"status":"ok","version":"1.0.0","environment":"development",
"uptimeSeconds":14,"node":"v22.22.3","memoryMb":113.3,"endpoints":94,"canvases":38,
"rateLimit":{"windowMs":60000,"max":120,"imageMax":60,"trustProxy":true},
"checks":{"assets":{"ok":true,"detail":"…/packages/backend/assets"},
"templates":{"ok":true,"detail":"38 archivos"},"fonts":{"ok":true,"detail":"4 fuentes"}}},
"meta":{"requestId":"8e86ab0f-…","durationMs":3,"cached":false,"timestamp":"2026-10-25T23:56:00.473Z"}}
```

**Canvas PNG**

```bash
curl -s -o brat.png -w "%{http_code} %{content_type} %{size_download}\n" \
  "http://localhost:4000/api/canvas/brat?text=Hola%20Velora&formato=png"
# 200 image/png 7427
# identify brat.png → PNG 736x736
```

**Hash (con alias en español)**

```bash
curl -s "http://localhost:4000/api/utils/hash?texto=velora&algoritmo=sha256"
```

```json
{"success":true,"data":{"text":"velora","algorithm":"sha256",
"hex":"62bd9942f0b0662f25e5b58771b6d2da3b9103b8545fb89ef986fe508cd0bd40",
"base64":"Yr2ZQvCwZi8l5bWHcbbS2juRA7hUX7ie+Yb+UIzQvUA=","bits":256,"bytes":32,"inputBytes":6},
"meta":{"requestId":"41a66bd0-…","durationMs":1,"cached":false,"timestamp":"2026-10-26T00:02:51.561Z"}}
```

**Error de validación**

```bash
curl -s "http://localhost:4000/api/canvas/brat?formato=png"
```

```json
{"success":false,"error":{"code":"VALIDATION_ERROR",
"message":"Hay parámetros inválidos en la petición.",
"details":[{"parameter":"text","in":"query","message":"es obligatorio"}],
"hint":"Revisa los parámetros marcados en la documentación del endpoint."},
"meta":{"requestId":"d1a6f04e-…","durationMs":0,"cached":false,"timestamp":"2026-10-26T23:56:35.087Z"}}
```

**Crear una nota (POST)**

```bash
curl -s -X POST http://localhost:4000/api/utils/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Prueba técnica","content":"Nota creada por curl","tags":["test"]}'
```

```json
{"success":true,"data":{"id":"8b32b9ae-b56e-4768-b579-257213f9ef06",
"title":"Prueba técnica","content":"Nota creada por curl","tags":["test"],
"createdAt":"2026-10-26T00:02:58.493Z","updatedAt":"2026-10-26T00:02:58.493Z"},
"meta":{"requestId":"5ebd4e18-…","durationMs":17,"cached":false,"timestamp":"2026-10-26T00:02:58.493Z"}}
```

**Búsqueda de emojis (dataset local)**

```bash
curl -s "http://localhost:4000/api/search/emoji?q=fire&limit=2"
# data.total = 9 · data.returned = 2 · emojis: ❤️‍🔥 heart_on_fire, 🧑‍🚒 firefighter
```

---

## Limitaciones y transparencia

- **Google Drive**: el conector de Drive no estaba disponible en el entorno de desarrollo, así que
  la carpeta «CategoriaCanvas» no se pudo inspeccionar directamente. Las 33 plantillas se
  obtuvieron del repositorio público del autor (`Velirius-storage`), que replica esa carpeta, y cada
  canvas conserva el nombre de archivo y la carpeta de origen en su definición. Si falta alguna
  plantilla original, basta con copiarla a `packages/backend/assets/canvas/` con el nombre que
  declara `origin.file`.
- **Proveedores externos**: Jikan, Openverse, LRCLIB, Wikipedia, GitHub, Open Library, iTunes,
  Hacker News y DuckDuckGo no eran accesibles desde el entorno (peticiones bloqueadas). El código
  de integración, la caché y los errores 502 están implementados, pero **no se verificaron
  respuestas en vivo** de esos proveedores. Los datasets locales (países, emojis, elenco) sí están
  verificados.
- **Vídeo**: no hay codificación de vídeo en el servidor (no se añadió ffmpeg como dependencia de
  runtime). Los canvas animados devuelven SVG SMIL y un PNG del fotograma.
- **Despliegue**: no se desplegó en Render ni en Vercel desde aquí. Sí se verificó el build y el
  arranque en modo producción en local, con la web y la API servidas desde el mismo proceso.
- **Interfaz**: no se pudo hacer una revisión visual con navegador real (el entorno no incluye uno);
  se verificaron el typecheck, el build, el HTML servido y la API, y se inspeccionaron los PNG
  generados. El diseño es responsive por construcción (Tailwind con breakpoints), pero conviene una
  pasada visual antes de publicar.
- **Persistencia**: las notas son una demostración en memoria. En serverless se reinician en cada
  arranque en frío. No hay base de datos a propósito para mantener el despliegue sin coste.

---

## Solución de problemas

| Síntoma | Causa / solución |
| --- | --- |
| `No se encontró la carpeta de assets` | Ejecuta desde la raíz del repo o define `ASSETS_DIR` con la ruta absoluta a `packages/backend/assets`. |
| `/api/health` devuelve 503 | Falta alguna plantilla o fuente. `checks` indica cuál. Ejecuta `npm run templates`. |
| Los endpoints de anime devuelven 502 | El proveedor no responde desde tu red. Comprueba `/api/download/providers`. El elenco local (`waifu`, `maid`, `gacha`, `character/random`) sigue funcionando. |
| En Vercel, `/api/...` devuelve HTML de la SPA | Falta el rewrite `/api/(.*)` o el nombre del servicio backend no coincide con `services`. Revisa `vercel.json` y los logs del servicio. |
| En Vercel, `/api/health` devuelve 503 y `checks.assets` falla | El servicio no recibió `assets/`: revisa que `functions["api/index.mjs"].includeFiles` sea `assets/**` y que el entrypoint configurado sea el mismo. |
| `CORS` bloqueado | Añade el origen exacto (con `https://`) a `CORS_ORIGINS` y redeploy. |
| El canvas devuelve 422 | Falta un parámetro obligatorio o el valor no cumple el tipo. El detalle indica el campo. |
| `sharp` no carga en Alpine | Usa una imagen con glibc (`node:22-slim`) o reinstala dependencias dentro de la imagen final. |
| Las notas desaparecen | Es un almacén en memoria por proceso; no hay persistencia. |

---

## Créditos y licencias

- **Plantillas de canvas**: carpeta «CategoriaCanvas» de Google Drive del autor del proyecto,
  replicadas en `Velirius-storage`. Se conservan los nombres de archivo originales.
- **Fuentes**: DejaVu Sans / DejaVu Sans Mono, con su licencia en `packages/backend/assets/fonts/LICENSE.txt`.
- **Datasets**: países de [`mledoze/countries`](https://github.com/mledoze/countries) (ODbL) y emojis
  de [`github/gemoji`](https://github.com/github/gemoji) (MIT).
- **Proveedores**: Jikan (MyAnimeList), Openverse, LRCLIB, Wikipedia, GitHub, Open Library, iTunes,
  Hacker News (Algolia) y DuckDuckGo. Cada endpoint documenta su fuente y sus límites.
- **Fotografías**: galería propia incluida en `packages/backend/assets/photos`.

Código bajo licencia MIT.
