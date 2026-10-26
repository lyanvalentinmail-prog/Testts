import { CANVASES, CATEGORIES, endpointsByCategory } from '@velora/shared';
import { ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CanvasTile } from '../components/CanvasTile';
import { EndpointCard } from '../components/EndpointCard';
import { categoryIcon } from '../components/Icons';
import { EmptyState } from '../components/States';
import { CATEGORY_ACCENT, cn } from '../lib/ui';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const category = CATEGORIES.find((item) => item.slug === slug);
  const [query, setQuery] = useState('');

  const canvases = useMemo(() => (category?.id === 'canvas' ? CANVASES : []), [category]);
  const endpoints = useMemo(() => {
    if (!category) return [];
    const list = endpointsByCategory(category.id);
    if (!query.trim()) return list;
    const term = query.toLowerCase();
    return list.filter((endpoint) =>
      `${endpoint.name} ${endpoint.path} ${endpoint.summary}`.toLowerCase().includes(term)
    );
  }, [category, query]);

  if (!category) {
    return (
      <EmptyState
        title="Categoría no encontrada"
        description="La categoría que buscas no existe o cambió de nombre."
        action={
          <Link to="/endpoints" className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-[12px] text-ink-soft">
            Ver todos los endpoints
          </Link>
        }
      />
    );
  }

  const Icon = categoryIcon(category.icon);
  const accent = CATEGORY_ACCENT[category.id];
  const filteredCanvases = query.trim()
    ? canvases.filter((canvas) => `${canvas.title} ${canvas.description} ${canvas.slug}`.toLowerCase().includes(query.toLowerCase()))
    : canvases;

  return (
    <div className="space-y-8 animate-in">
      <div>
        <Link to="/endpoints" className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink">
          <ArrowLeft className="size-3.5" /> Todos los endpoints
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-2xl border border-line-soft bg-panel/60 p-5 sm:p-6">
        <span
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: accent.hex }}
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-start gap-4">
          <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl ring-1', accent.soft, accent.ring, accent.text)}>
            <Icon className="size-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[26px] font-semibold tracking-tight text-white">{category.name}</h1>
              <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 font-mono text-[10.5px] text-muted">
                {endpoints.length} endpoints
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-ink-soft">{category.tagline}</p>
            <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-muted">{category.description}</p>
          </div>
        </div>
      </header>

      {category.id === 'canvas' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink">Galería de plantillas</h2>
            <span className="font-mono text-[11px] text-faint">{filteredCanvases.length} canvas</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCanvases.map((canvas) => (
              <CanvasTile key={canvas.slug} canvas={canvas} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">
            {category.id === 'canvas' ? 'Documentación de los canvas' : 'Endpoints de la categoría'}
          </h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filtrar en ${category.name}…`}
              className="h-8 w-56 rounded-lg border border-line bg-panel/70 pl-8 pr-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand/60"
              aria-label={`Filtrar endpoints de ${category.name}`}
            />
          </div>
        </div>

        {endpoints.length === 0 ? (
          <EmptyState title="Nada por aquí" description="No hay endpoints que coincidan con el filtro." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.id} endpoint={endpoint} />
            ))}
          </div>
        )}
      </section>

      <Link
        to="/docs"
        className="flex items-center justify-between rounded-xl border border-line-soft bg-panel/40 px-4 py-3 text-[12.5px] text-muted transition-colors hover:bg-panel-2 hover:text-ink"
      >
        <span>¿Cómo se añaden endpoints o canvas a esta categoría?</span>
        <span className="inline-flex items-center gap-1 text-brand-soft">
          Ver guía <ArrowRight className="size-3.5" />
        </span>
      </Link>
    </div>
  );
}
