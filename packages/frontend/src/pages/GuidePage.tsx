import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Cloud,
  Code2,
  Image as ImageIcon,
  Lock,
  Server,
  ShieldCheck,
  Terminal,
  Wrench,
} from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';
import { STATS } from '@velora/shared';

const SECCIONES = [
  { id: 'inicio', label: 'Inicio rápido' },
  { id: 'respuesta', label: 'Formato de respuesta' },
  { id: 'autenticacion', label: 'Autenticación' },
  { id: 'errores', label: 'Errores y límites' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'ampliar', label: 'Ampliar la plataforma' },
  { id: 'despliegue', label: 'Despliegue' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'problemas', label: 'Problemas frecuentes' },
];

const ERRORES = [
  ['BAD_REQUEST', '400', 'El cuerpo o la URL no se pudieron interpretar.'],
  ['VALIDATION_ERROR', '422', 'Uno o más parámetros no cumplen las reglas del catálogo.'],
  ['NOT_FOUND', '404', 'El recurso o la ruta no existen.'],
  ['METHOD_NOT_ALLOWED', '405', 'El método HTTP no está permitido en esa ruta.'],
  ['PAYLOAD_TOO_LARGE', '413', 'El archivo o el cuerpo superan el límite permitido.'],
  ['UNSUPPORTED_MEDIA_TYPE', '415', 'El Content-Type no es el esperado.'],
  ['RATE_LIMITED', '429', 'Se superó el número de peticiones por ventana.'],
  ['UPSTREAM_BLOCKED', '403', 'La URL solicitada apunta a una red privada o no permitida (SSRF).'],
  ['PROVIDER_UNAVAILABLE', '502', 'El proveedor externo no respondió o devolvió un error.'],
  ['INTERNAL_ERROR', '500', 'Fallo inesperado del servidor (incluye requestId para rastrearlo).'],
];

export function GuidePage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
            <BookOpen className="size-3" /> Guía de uso
          </p>
          <nav className="space-y-0.5">
            {SECCIONES.map((seccion) => (
              <a
                key={seccion.id}
                href={`#${seccion.id}`}
                className="block rounded-md px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-panel-2 hover:text-ink"
              >
                {seccion.label}
              </a>
            ))}
          </nav>
          <div className="rounded-xl border border-line-soft bg-panel/60 p-3 text-[11px] leading-relaxed text-faint">
            <p className="text-ink-soft">{STATS.endpoints} endpoints documentados</p>
            <p>{STATS.canvases} canvas con plantillas reales</p>
            <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-brand-soft/90">
              OpenAPI 3.1 <ArrowRight className="size-3" />
            </a>
          </div>
        </div>
      </aside>

      <article className="min-w-0 space-y-10 animate-in">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Documentación</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-white sm:text-[32px]">Guía de uso</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Todo lo necesario para consumir Velora API, entender sus respuestas y desplegarla en Render o Vercel.
          </p>
        </header>

        <section id="inicio" className="scroll-mt-24 space-y-3">
          <h2 className="text-[19px] font-semibold text-white">Inicio rápido</h2>
          <p className="text-[13px] leading-relaxed text-muted">
            La API vive bajo <code className="rounded bg-panel-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-soft">/api</code>. En
            este despliegue comparte origen con la web, así que puedes usar rutas relativas. Todas las peticiones
            <code className="mx-1 rounded bg-panel-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-soft">GET</code>
            se pueden abrir directamente en el navegador.
          </p>
          <CodeBlock
            language="bash"
            filename="primera-peticion.sh"
            code={`# Lista los canvas disponibles
curl -s http://localhost:4000/api/canvas | jq

# Genera una imagen PNG con una plantilla real
curl -s "http://localhost:4000/api/canvas/brat?text=Hola%20Velora&formato=png" -o brat.png

# Consulta el catálogo completo
curl -s "http://localhost:4000/api/endpoints?category=anime&limit=5" | jq`}
          />
          <div className="flex flex-wrap gap-1.5">
            {['/api/health', '/api/endpoints', '/api/categories', '/api/canvas', '/api/download/qr?data=hola'].map((path) => (
              <a
                key={path}
                href={path}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line bg-panel-2/60 px-2 py-1 font-mono text-[10.5px] text-ink-soft hover:text-ink"
              >
                {path}
              </a>
            ))}
          </div>
        </section>

        <section id="respuesta" className="scroll-mt-24 space-y-3">
          <h2 className="text-[19px] font-semibold text-white">Formato de respuesta</h2>
          <p className="text-[13px] leading-relaxed text-muted">
            Las respuestas JSON comparten un sobre estable. Los errores usan el mismo sobre con <code className="font-mono text-ink-soft">success: false</code> y
            un objeto <code className="font-mono text-ink-soft">error</code> con código, mensaje, detalles y pista.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <CodeBlock
              language="json"
              filename="200 OK"
              code={`{
  "success": true,
  "data": { "…": "resultado del endpoint" },
  "meta": {
    "requestId": "4f2a9f0e-8c1b-4d3a-9b4e-3a6d1c2b7e90",
    "durationMs": 118,
    "cached": false,
    "timestamp": "2026-10-25T21:04:12.418Z"
  }
}`}
              maxHeight="16rem"
            />
            <CodeBlock
              language="json"
              filename="422 Unprocessable Entity"
              code={`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Hay parámetros inválidos en la petición.",
    "details": [
      { "parameter": "text", "in": "query", "message": "es obligatorio" }
    ],
    "hint": "Revisa los parámetros marcados en la documentación."
  },
  "meta": { "requestId": "…", "durationMs": 0, "timestamp": "…" }
}`}
              maxHeight="16rem"
            />
          </div>
          <p className="text-[12.5px] text-muted">
            Cabeceras útiles: <code className="font-mono text-ink-soft">X-Request-Id</code> (traza),
            <code className="mx-1 font-mono text-ink-soft">X-Velora-Cache</code> (hit/miss),
            <code className="mx-1 font-mono text-ink-soft">X-RateLimit-Limit</code>,
            <code className="mx-1 font-mono text-ink-soft">X-RateLimit-Remaining</code> y
            <code className="mx-1 font-mono text-ink-soft">Content-Disposition</code> en descargas.
          </p>
        </section>

        <section id="autenticacion" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <Lock className="size-4 text-brand-soft" /> Autenticación
          </h2>
          <p className="text-[13px] leading-relaxed text-muted">
            Por defecto la API es pública y no requiere clave. Si defines <code className="font-mono text-ink-soft">VELORA_API_KEY</code> en el
            servidor, todas las rutas <code className="font-mono text-ink-soft">/api</code> exigen la cabecera
            <code className="mx-1 font-mono text-ink-soft">X-API-Key</code>. La clave nunca se expone al frontend público: este explorador
            funciona sin ella porque las peticiones las hace tu navegador contra el mismo origen.
          </p>
          <CodeBlock
            language="bash"
            filename="con-api-key.sh"
            code={`curl -s http://localhost:4000/api/endpoints \\
  -H "X-API-Key: $VELORA_API_KEY"`}
          />
          <p className="text-[12.5px] text-muted">
            Los endpoints de salud (<code className="font-mono text-ink-soft">/api/health</code>) también respetan la clave si está activa.
            Para comparar el sobre documentado con tu entorno, consulta <Link to="/e/system.health" className="text-brand-soft/90 hover:text-brand-soft">/api/health</Link>.
          </p>
        </section>

        <section id="errores" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <AlertTriangle className="size-4 text-amber-300" /> Errores y límites
          </h2>
          <div className="overflow-hidden rounded-xl border border-line-soft">
            <table className="w-full border-collapse text-left text-[12px]">
              <thead className="bg-panel-2/60 text-[10.5px] uppercase tracking-wide text-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">HTTP</th>
                  <th className="px-3 py-2 font-medium">Cuándo ocurre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {ERRORES.map(([code, status, description]) => (
                  <tr key={code}>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-soft">{code}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">{status}</td>
                    <td className="px-3 py-2 text-[11.5px] text-muted">{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12.5px] leading-relaxed text-muted">
            <span className="font-medium text-ink-soft">Rate limit:</span> 120 peticiones por minuto y 60 generaciones de imagen por
            IP (configurable con <code className="font-mono text-ink-soft">RATE_LIMIT_MAX</code> y <code className="font-mono text-ink-soft">RATE_LIMIT_IMAGE_MAX</code>).
            Al superarlo se devuelve 429 con <code className="font-mono text-ink-soft">Retry-After</code>.
          </p>
        </section>

        <section id="canvas" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <ImageIcon className="size-4 text-violet-300" /> Canvas
          </h2>
          <p className="text-[13px] leading-relaxed text-muted">
            Cada canvas compone tu texto o imagen sobre una plantilla original de la carpeta <span className="text-ink-soft">«CategoriaCanvas»</span> de
            Google Drive. El servidor genera un SVG, lo rasteriza con <span className="text-ink-soft">resvg</span> y devuelve la imagen. No se
            guardan archivos: todo el proceso ocurre en memoria durante la petición.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <CodeBlock
              language="bash"
              filename="canvas-por-url.sh"
              code={`curl -s "http://localhost:4000/api/canvas/brat?text=Hola&formato=webp" -o hola.webp`}
              maxHeight="10rem"
            />
            <CodeBlock
              language="bash"
              filename="canvas-con-archivo.sh"
              code={`curl -s "http://localhost:4000/api/canvas/minions?text=banana" \\
  -F "image=@cara1.png" -F "image2=@cara2.png" \\
  -o minions.png`}
              maxHeight="10rem"
            />
          </div>
          <ul className="list-inside list-disc space-y-1 text-[12.5px] text-muted">
            <li>Formatos: <code className="font-mono text-ink-soft">png</code> (por defecto), <code className="font-mono text-ink-soft">jpeg</code>, <code className="font-mono text-ink-soft">webp</code> y <code className="font-mono text-ink-soft">svg</code>.</li>
            <li>Imágenes aceptadas: PNG, JPEG, WebP o GIF con límite de 8 MB; se reconvierten a data URI y se validan antes de usarse.</li>
            <li>Los canvas animados (<code className="font-mono text-ink-soft">bratvideo</code>, <code className="font-mono text-ink-soft">attp</code>) devuelven SVG con animación SMIL, no vídeo: no hay codificación de vídeo en el servidor.</li>
            <li>Añadir un canvas = copiar la plantilla a <code className="font-mono text-ink-soft">assets/canvas</code>, definir sus zonas en el catálogo y listo: la documentación, el OpenAPI y la galería se generan solos.</li>
          </ul>
        </section>

        <section id="ampliar" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <Wrench className="size-4 text-amber-300" /> Ampliar la plataforma
          </h2>
          <p className="text-[13px] leading-relaxed text-muted">
            El catálogo es la única fuente de verdad: de él salen la documentación, los formularios, el OpenAPI y los
            contadores. Para añadir un endpoint nuevo hay que tocar dos sitios.
          </p>
          <ol className="space-y-2 text-[12.5px] text-muted">
            <li>
              <span className="font-medium text-ink-soft">1. Definir el endpoint</span> en{' '}
              <code className="font-mono text-[11.5px] text-ink-soft">packages/shared/src/catalog/&lt;categoría&gt;.ts</code> (id, nombre, ruta,
              parámetros, respuestas, ejemplos).
            </li>
            <li>
              <span className="font-medium text-ink-soft">2. Registrar el handler</span> en{' '}
              <code className="font-mono text-[11.5px] text-ink-soft">packages/backend/src/routes/</code> con su{' '}
              <code className="font-mono text-[11.5px] text-ink-soft">validateQuery('&lt;id&gt;')</code>.
            </li>
            <li>
              <span className="font-medium text-ink-soft">3. Añadir el ejemplo de respuesta</span> en{' '}
              <code className="font-mono text-[11.5px] text-ink-soft">packages/frontend/src/lib/examples.ts</code> (opcional, mejora la documentación).
            </li>
            <li>
              <span className="font-medium text-ink-soft">4. Verificar</span>: <code className="font-mono text-[11.5px] text-ink-soft">npm run typecheck</code> y{' '}
              <code className="font-mono text-[11.5px] text-ink-soft">npm test</code>. Un test comprueba que el catálogo y las rutas registradas coinciden.
            </li>
          </ol>
          <p className="text-[12.5px] text-muted">
            Las categorías se definen en <code className="font-mono text-ink-soft">catalog/categories.ts</code> y se colorean en{' '}
            <code className="font-mono text-ink-soft">frontend/src/lib/ui.ts</code>.
          </p>
        </section>

        <section id="despliegue" className="scroll-mt-24 space-y-4">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <Cloud className="size-4 text-sky-300" /> Despliegue
          </h2>
          <div className="rounded-xl border border-line-soft bg-panel/60 p-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Server className="size-4 text-emerald-300" /> Render (recomendado, servicio único)
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              El <code className="font-mono text-ink-soft">render.yaml</code> incluido compila la web y la API y arranca un único
              servicio Node que sirve ambos. Health check en <code className="font-mono text-ink-soft">/api/health</code>. No se escribe
              en disco: las notas y la caché viven en memoria y se reinician con cada despliegue.
            </p>
            <CodeBlock
              language="bash"
              filename="render.sh"
              className="mt-3"
              maxHeight="9rem"
              code={`# Build
npm ci
npm run build            # backend (dist/server.js) + frontend (packages/frontend/dist)

# Start
npm start                # node packages/backend/dist/server.js`}
            />
            <p className="mt-2 text-[12px] text-muted">
              Variables: <code className="font-mono text-ink-soft">PORT</code> (Render la inyecta),{' '}
              <code className="font-mono text-ink-soft">NODE_ENV=production</code>,{' '}
              <code className="font-mono text-ink-soft">CORS_ORIGINS</code> y opcionalmente{' '}
              <code className="font-mono text-ink-soft">VELORA_API_KEY</code>.
            </p>
          </div>

          <div className="rounded-xl border border-line-soft bg-panel/60 p-4">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Cloud className="size-4 text-sky-300" /> Vercel
            </h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              La opción verificable es desplegar el frontend como sitio estático y apuntarlo a la API de Render con{' '}
              <code className="font-mono text-ink-soft">VITE_API_URL</code>. El <code className="font-mono text-ink-soft">vercel.json</code> incluido
              ya configura el build y las reescrituras de SPA.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[12px] text-muted">
              <li>Build: <code className="font-mono text-ink-soft">npm run build:web</code> · salida: <code className="font-mono text-ink-soft">packages/frontend/dist</code>.</li>
              <li>Variable de entorno: <code className="font-mono text-ink-soft">VITE_API_URL=https://tu-api.onrender.com</code>.</li>
              <li>
                Una función serverless completa (API + frontend en Vercel) es posible, pero tiene límite de 10 s por petición y
                binarios nativos (<code className="font-mono text-ink-soft">sharp</code>, <code className="font-mono text-ink-soft">@resvg/resvg-js</code>): los canvas pesados y las
                descargas grandes pueden agotar el tiempo. Para eso se recomienda Render.
              </li>
            </ul>
          </div>
        </section>

        <section id="seguridad" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <ShieldCheck className="size-4 text-emerald-300" /> Seguridad
          </h2>
          <ul className="grid gap-2 text-[12.5px] text-muted sm:grid-cols-2">
            {[
              ['Validación estricta', 'Tipo, rango, longitud, patrón y enumeraciones por parámetro. Los errores detallan el campo.'],
              ['Subidas acotadas', 'Límite de 8 MB, tipos permitidos y normalización de imágenes antes de usarlas.'],
              ['Protección SSRF', 'Las URLs externas se resuelven y rechazan redes privadas, loopback y metadatos cloud.'],
              ['CORS restringido', 'Orígenes permitidos configurables; el frontend público no contiene claves.'],
              ['Rate limiting', 'Ventanas por IP con límites distintos para imagen y JSON.'],
              ['Sin ejecución de código', 'Las utilidades solo calculan sobre datos; nunca evalúan entrada del usuario.'],
            ].map(([title, description]) => (
              <li key={title} className="rounded-lg border border-line-soft bg-panel/50 p-2.5">
                <p className="font-medium text-ink-soft">{title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-faint">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="problemas" className="scroll-mt-24 space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold text-white">
            <Terminal className="size-4 text-faint" /> Problemas frecuentes
          </h2>
          <dl className="space-y-3 text-[12.5px]">
            {[
              [
                'Los endpoints de anime o búsqueda devuelven 502',
                'El proveedor externo (Jikan, LRCLIB, DuckDuckGo…) no responde desde tu red o desde el entorno de despliegue. Comprueba /api/download/providers y consulta las notas del endpoint.',
              ],
              [
                'El health devuelve 503 con «Servicio degradado»',
                'Faltan plantillas o fuentes en assets. El detalle de cada comprobación aparece en /api/health.',
              ],
              [
                'Las imágenes no se generan',
                'Revisa que el formato sea png/jpeg/webp/svg y que el texto no esté vacío. Los parámetros obligatorios se indican en la consola.',
              ],
              [
                'Las notas desaparecen',
                'El almacén de notas es en memoria y por proceso: no hay persistencia en serverless. Es una demo de POST/PUT/DELETE.',
              ],
              [
                'Error de CORS al consumir desde otro dominio',
                'Añade el origen exacto a CORS_ORIGINS (separado por comas) y vuelve a desplegar.',
              ],
            ].map(([question, answer]) => (
              <div key={question} className="rounded-xl border border-line-soft bg-panel/50 p-3">
                <dt className="font-medium text-ink-soft">{question}</dt>
                <dd className="mt-1 leading-relaxed text-muted">{answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-5 text-[12px] text-faint">
          <Code2 className="size-3.5" /> Código fuente y catálogo completo en el repositorio.
          <a
            href="https://github.com/lyanvalentinmail-prog/Testts"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-brand-soft/90 hover:text-brand-soft"
          >
            GitHub <ArrowRight className="size-3" />
          </a>
        </footer>
      </article>
    </div>
  );
}
