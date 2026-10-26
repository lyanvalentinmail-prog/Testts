import { CATEGORIES, ENDPOINTS, searchEndpoints, type HttpMethod } from '@velora/shared';
import { Filter, Search, X } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EndpointCard } from '../components/EndpointCard';
import { EmptyState } from '../components/States';
import { CATEGORY_LABEL, cn } from '../lib/ui';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

export function EndpointsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('cat') ?? '';
  const method = params.get('method') ?? '';

  const results = useMemo(
    () => searchEndpoints({ q, category: category || undefined, method: method || undefined }),
    [q, category, method]
  );

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const activeFilters = Boolean(q || category || method);

  return (
    <div className="space-y-6 animate-in">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Catálogo</p>
        <h1 className="text-[26px] font-semibold tracking-tight text-white sm:text-[30px]">Todos los endpoints</h1>
        <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted">
          {ENDPOINTS.length} endpoints documentados y ejecutables. Filtra por categoría, método HTTP o busca por
          nombre, ruta y etiquetas.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-line-soft bg-panel/60 p-3.5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(event) => update('q', event.target.value)}
              placeholder="Buscar por nombre, ruta, descripción o etiqueta…"
              className="h-10 w-full rounded-lg border border-line bg-panel-2/70 pl-9 pr-9 text-[13px] text-ink outline-none placeholder:text-faint focus:border-brand/60"
              aria-label="Buscar endpoints"
            />
            {q && (
              <button
                type="button"
                onClick={() => update('q', '')}
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-panel-3 hover:text-ink"
                aria-label="Borrar búsqueda"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Método HTTP</span>
              <select
                value={method}
                onChange={(event) => update('method', event.target.value)}
                className="h-10 appearance-none rounded-lg border border-line bg-panel-2/70 pl-3 pr-8 text-[12.5px] text-ink-soft outline-none focus:border-brand/60"
              >
                <option value="">Todos los métodos</option>
                {METHODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <Filter className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
            </label>
            {activeFilters && (
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-soft px-3 text-[12px] text-muted hover:bg-panel-2 hover:text-ink"
              >
                <X className="size-3.5" /> Limpiar
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => update('cat', '')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
              !category
                ? 'border-brand/40 bg-brand/15 text-brand-soft'
                : 'border-line-soft text-muted hover:border-line hover:text-ink-soft'
            )}
          >
            Todas
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => update('cat', category === item.id ? '' : item.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11.5px] transition-colors',
                category === item.id
                  ? 'border-brand/40 bg-brand/15 text-brand-soft'
                  : 'border-line-soft text-muted hover:border-line hover:text-ink-soft'
              )}
            >
              {CATEGORY_LABEL[item.id]}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-faint">{results.length} resultados</span>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No encontramos endpoints con esos filtros"
          description="Prueba con otro término, cambia la categoría o quita el filtro de método."
          action={
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-[12px] text-ink-soft hover:text-ink"
            >
              Restablecer filtros
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
        </div>
      )}
    </div>
  );
}
