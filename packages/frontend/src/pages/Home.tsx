import {
  CANVASES,
  categoryWithCounts,
  FEATURED_ENDPOINTS,
  STATS,
} from '@velora/shared';
import {
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { EndpointCard } from '../components/EndpointCard';
import { categoryIcon } from '../components/Icons';
import { CATEGORY_ACCENT, cn } from '../lib/ui';

const categories = categoryWithCounts();
const featured = FEATURED_ENDPOINTS.filter((endpoint) => endpoint.category !== 'canvas').slice(0, 6);
const featuredCanvases = CANVASES.filter((canvas) => canvas.featured).slice(0, 3);

export function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [codeTab, setCodeTab] = useState<'curl' | 'js' | 'py'>('curl');

  const samples = useMemo(
    () => ({
      curl: `curl --request GET \\
  --url '${typeof window !== 'undefined' ? window.location.origin : ''}/api/canvas/brat?text=Hola%20Velora&formato=png' \\
  --output brat.png`,
      js: `const response = await fetch('/api/canvas/brat?text=Hola%20Velora&formato=png');
const blob = await response.blob();
console.log(URL.createObjectURL(blob));`,
      py: `import requests

response = requests.get(
    "${typeof window !== 'undefined' ? window.location.origin : ''}/api/canvas/brat",
    params={"text": "Hola Velora", "formato": "png"},
    timeout=30,
)
open("brat.png", "wb").write(response.content)`,
    }),
    []
  );

  return (
    <div className="space-y-14 animate-in">
      {/* ------------------------------- Hero ------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl border border-line-soft bg-radial-brand">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" aria-hidden="true" />
        <div className="relative px-5 py-12 sm:px-10 sm:py-16">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand-soft">
              <Sparkles className="size-3" /> {STATS.endpoints} endpoints reales · {STATS.canvases} canvas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/70 px-2.5 py-1 text-[11px] text-muted">
              <ShieldCheck className="size-3 text-emerald-400" /> Validación y límites activos
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel/70 px-2.5 py-1 text-[11px] text-muted">
              OpenAPI 3.1
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl text-balance text-[34px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[46px]">
            Una API para crear, buscar y descargar.
            <span className="block bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              Documentada, probada y lista para usar.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-soft">
            Velora API reúne generación de imágenes con plantillas reales de Google Drive, datos de anime,
            búsquedas federadas, descargas seguras y utilidades para desarrolladores. Todo se puede probar aquí
            mismo, con formularios generados desde el catálogo y ejemplos en cURL, JavaScript y Python.
          </p>

          <form
            className="mt-7 flex max-w-xl items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(query.trim() ? `/endpoints?q=${encodeURIComponent(query.trim())}` : '/endpoints');
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca «canvas», «anime», «qr», «uuid»…"
                className="h-11 w-full rounded-xl border border-line bg-panel/80 pl-9 pr-3 text-[13.5px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/60"
                aria-label="Buscar endpoints"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-gradient-to-b from-violet-500 to-indigo-600 px-4 text-[13px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(124,92,255,0.9)] transition-all hover:brightness-110"
            >
              Buscar <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              to="/endpoints"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel/60 px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:bg-panel-2 hover:text-ink"
            >
              Explorar los {STATS.endpoints} endpoints
            </Link>
            <Link
              to="/canvas"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft bg-panel/40 px-3 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            >
              <ImageIcon className="size-3.5" /> Galería de canvas
            </Link>
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12.5px] text-muted transition-colors hover:text-ink"
            >
              <BookOpen className="size-3.5" /> Guía de uso
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------- Stats ------------------------------ */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Endpoints', value: STATS.endpoints, hint: 'registrados y documentados' },
          { label: 'Canvas', value: STATS.canvases, hint: 'plantillas reales' },
          { label: 'Categorías', value: STATS.categories, hint: 'extensibles' },
          { label: 'Salidas de imagen', value: STATS.imageEndpoints, hint: 'PNG · JPEG · WebP · SVG' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line-soft bg-panel/60 p-4">
            <p className="font-mono text-[26px] font-semibold leading-none tracking-tight text-white">{stat.value}</p>
            <p className="mt-2 text-[12.5px] font-medium text-ink-soft">{stat.label}</p>
            <p className="text-[11px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </section>

      {/* ----------------------------- Categories --------------------------- */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-white">Categorías</h2>
            <p className="mt-1 text-[13px] text-muted">Cada categoría agrupa endpoints con una finalidad concreta.</p>
          </div>
          <Link to="/endpoints" className="hidden shrink-0 items-center gap-1 text-[12.5px] text-muted hover:text-ink sm:flex">
            Ver todas <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const Icon = categoryIcon(category.icon);
            const accent = CATEGORY_ACCENT[category.id];
            return (
              <Link
                key={category.id}
                to={`/c/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-line-soft bg-panel/60 p-4 transition-all hover:-translate-y-0.5 hover:border-line hover:bg-panel-2"
              >
                <span
                  className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.14] blur-2xl transition-opacity group-hover:opacity-25"
                  style={{ backgroundColor: accent.hex }}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-2.5">
                  <span className={cn('grid size-9 place-items-center rounded-xl ring-1', accent.soft, accent.ring, accent.text)}>
                    <Icon className="size-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-ink">{category.name}</h3>
                    <p className="truncate text-[11.5px] text-faint">{category.tagline}</p>
                  </div>
                  <span className="ml-auto rounded-md border border-line-soft bg-panel px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
                    {category.count}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-muted">{category.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-faint transition-colors group-hover:text-ink-soft">
                  Explorar categoría <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ------------------------------ Featured ---------------------------- */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-white">Endpoints destacados</h2>
            <p className="mt-1 text-[13px] text-muted">Los más útiles para empezar a construir.</p>
          </div>
          <Link to="/endpoints" className="hidden shrink-0 items-center gap-1 text-[12.5px] text-muted hover:text-ink sm:flex">
            Catálogo completo <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
        </div>
      </section>

      {/* --------------------------- Canvas preview ------------------------- */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-white">Canvas con plantillas reales</h2>
            <p className="mt-1 text-[13px] text-muted">
              Imágenes compuestas sobre las plantillas de la carpeta «CategoriaCanvas» de Google Drive.
            </p>
          </div>
          <Link to="/canvas" className="flex shrink-0 items-center gap-1 text-[12.5px] text-muted hover:text-ink">
            Ver galería <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCanvases.map((canvas) => (
            <Link
              key={canvas.slug}
              to={`/e/canvas.${canvas.slug}`}
              className="group overflow-hidden rounded-2xl border border-line-soft bg-panel/60 transition-colors hover:border-line"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0d12]">
                <img
                  src={`/api/canvas/${canvas.slug}/preview`}
                  alt={`Plantilla ${canvas.title}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/80 backdrop-blur">
                  {canvas.width}×{canvas.height}
                </span>
              </div>
              <div className="p-3.5">
                <h3 className="text-[13.5px] font-medium text-ink">{canvas.title}</h3>
                <p className="mt-1 line-clamp-1 text-[11.5px] text-faint">{canvas.description}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-brand-soft/90">
                  Probar canvas <ArrowRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------ Quickstart -------------------------- */}
      <section className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3">
          <h2 className="text-[20px] font-semibold tracking-tight text-white">Empieza en un minuto</h2>
          <p className="text-[13px] leading-relaxed text-muted">
            La API no requiere clave por defecto. Todas las respuestas JSON comparten el mismo sobre
            <code className="mx-1 rounded bg-panel-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-soft">success</code>
            /
            <code className="mx-1 rounded bg-panel-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-soft">data</code>
            /
            <code className="mx-1 rounded bg-panel-2 px-1 py-0.5 font-mono text-[11.5px] text-ink-soft">meta</code>
            , y los errores incluyen un código estable y una pista accionable.
          </p>
          <ul className="space-y-2 text-[12.5px] text-muted">
            {[
              ['Catálogo navegable', 'Filtra por categoría, método o texto y abre la documentación completa de cada endpoint.'],
              ['Consola integrada', 'Los formularios se generan desde las definiciones; puedes ejecutar y descargar el resultado.'],
              ['Plantillas originales', 'Cada canvas declara el archivo y la carpeta de Google Drive del que procede.'],
              ['Seguro por diseño', 'Validación de parámetros, límites de subida, rate limiting y protección SSRF.'],
            ].map(([title, description]) => (
              <li key={title} className="flex gap-2">
                <Zap className="mt-0.5 size-3.5 shrink-0 text-brand-soft" />
                <span>
                  <span className="font-medium text-ink-soft">{title}.</span> {description}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to="/docs"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2/60 px-3 py-1.5 text-[12px] text-ink-soft hover:text-ink"
            >
              <BookOpen className="size-3.5" /> Leer la guía
            </Link>
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft px-3 py-1.5 text-[12px] text-muted hover:text-ink"
            >
              Descargar OpenAPI
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-line-soft bg-panel/60 p-3">
          <div className="mb-2 flex gap-1">
            {(['curl', 'js', 'py'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCodeTab(item)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11.5px] transition-colors',
                  codeTab === item ? 'bg-brand/15 text-brand-soft' : 'text-muted hover:bg-panel-2 hover:text-ink-soft'
                )}
              >
                {item === 'curl' ? 'cURL' : item === 'js' ? 'JavaScript' : 'Python'}
              </button>
            ))}
          </div>
          <CodeBlock
            code={codeTab === 'curl' ? samples.curl : codeTab === 'js' ? samples.js : samples.py}
            filename={codeTab === 'curl' ? 'brat.sh' : codeTab === 'js' ? 'brat.mjs' : 'brat.py'}
            maxHeight="18rem"
          />
        </div>
      </section>
    </div>
  );
}
