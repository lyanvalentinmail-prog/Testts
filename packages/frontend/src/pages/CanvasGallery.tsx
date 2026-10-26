import { CANVASES, CANVAS_GROUPS, STATS, type CanvasGroup } from '@velora/shared';
import { Image as ImageIcon, Search, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CanvasTile } from '../components/CanvasTile';
import { EmptyState } from '../components/States';
import { cn } from '../lib/ui';

const GROUPS = Object.keys(CANVAS_GROUPS) as CanvasGroup[];

export function CanvasGallery() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<CanvasGroup | ''>('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return CANVASES.filter((canvas) => {
      if (group && canvas.group !== group) return false;
      if (!term) return true;
      return `${canvas.title} ${canvas.description} ${canvas.slug}`.toLowerCase().includes(term);
    });
  }, [query, group]);

  const visibleGroups = GROUPS.filter((item) => filtered.some((canvas) => canvas.group === item));

  return (
    <div className="space-y-7 animate-in">
      <header className="relative overflow-hidden rounded-2xl border border-line-soft bg-panel/60 p-5 sm:p-7">
        <span className="pointer-events-none absolute -right-10 -top-24 size-64 rounded-full bg-violet-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
            <Sparkles className="size-3" /> {STATS.canvases} plantillas reales
          </span>
          <h1 className="mt-3 text-[26px] font-semibold tracking-tight text-white sm:text-[30px]">Galería de canvas</h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-muted">
            Cada canvas compone tu texto o imagen sobre una plantilla original de la carpeta{' '}
            <span className="text-ink-soft">«CategoriaCanvas»</span> de Google Drive. El servidor rasteriza el SVG con
            resvg y devuelve PNG, JPEG, WebP o SVG.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11.5px] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="size-3.5" /> Vista previa generada en vivo
            </span>
            <span>·</span>
            <span>Sin almacenamiento temporal</span>
            <span>·</span>
            <span>Formatos: png · jpeg · webp · svg</span>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar canvas por nombre o descripción…"
              className="h-9 w-full rounded-lg border border-line bg-panel/70 pl-9 pr-3 text-[12.5px] text-ink outline-none placeholder:text-faint focus:border-brand/60"
              aria-label="Buscar canvas"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGroup('')}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                !group ? 'border-violet-500/40 bg-violet-500/15 text-violet-200' : 'border-line-soft text-muted hover:text-ink-soft'
              )}
            >
              Todos
            </button>
            {GROUPS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGroup(group === item ? '' : item)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                  group === item
                    ? 'border-violet-500/40 bg-violet-500/15 text-violet-200'
                    : 'border-line-soft text-muted hover:text-ink-soft'
                )}
              >
                {CANVAS_GROUPS[item].label.replace('Canvas ', '').replace(' con ', ' · ')}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] text-faint">{filtered.length} canvas</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Sin canvas que coincidan" description="Prueba otro término o cambia el grupo." />
        ) : (
          <div className="space-y-8">
            {visibleGroups.map((item) => {
              const list = filtered.filter((canvas) => canvas.group === item);
              return (
                <section key={item} className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-[14.5px] font-semibold text-ink">{CANVAS_GROUPS[item].label}</h2>
                    <span className="font-mono text-[10.5px] text-faint">{list.length}</span>
                    <p className="hidden truncate text-[11.5px] text-faint sm:block">{CANVAS_GROUPS[item].description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.map((canvas) => (
                      <CanvasTile key={canvas.slug} canvas={canvas} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
