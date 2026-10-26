import { searchEndpoints } from '@velora/shared';
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLockBody } from '../lib/hooks';
import { CATEGORY_LABEL, cn } from '../lib/ui';
import { MethodBadge } from './MethodBadge';

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useLockBody(open);

  const results = useMemo(() => searchEndpoints({ q: query, limit: 14 }), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((index) => Math.min(index + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        const target = results[active];
        if (target) {
          event.preventDefault();
          navigate(`/e/${target.id}`);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, active, navigate, onClose]);

  useEffect(() => {
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Buscar endpoint">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] animate-in">
        <div className="flex items-center gap-3 border-b border-line-soft px-4">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca por nombre, ruta, categoría o etiqueta…"
            className="h-14 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-faint"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="rounded-md border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-faint">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ink-soft">No hay endpoints que coincidan con «{query}».</p>
              <p className="mt-1 text-xs text-faint">Prueba con «canvas», «anime», «qr» o «uuid».</p>
            </div>
          ) : (
            results.map((endpoint, index) => (
              <button
                key={endpoint.id}
                type="button"
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  navigate(`/e/${endpoint.id}`);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  index === active ? 'bg-brand/10' : 'hover:bg-panel-2'
                )}
              >
                <MethodBadge method={endpoint.method} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[13.5px] font-medium text-ink">{endpoint.name}</span>
                    <span className="shrink-0 text-[10.5px] uppercase tracking-wide text-faint">
                      {CATEGORY_LABEL[endpoint.category]}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[11.5px] text-muted">{endpoint.path}</span>
                </span>
                <ArrowRight className={cn('size-4 shrink-0 text-faint transition-opacity', index === active ? 'opacity-100' : 'opacity-0')} />
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line-soft bg-panel-2/40 px-4 py-2 text-[11px] text-faint">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-panel px-1 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-line bg-panel px-1 font-mono text-[10px]">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-line bg-panel px-1 font-mono text-[10px]">
                <CornerDownLeft className="size-2.5" />
              </kbd>
              abrir
            </span>
          </span>
          <span>{results.length} resultados</span>
        </div>
      </div>
    </div>
  );
}
