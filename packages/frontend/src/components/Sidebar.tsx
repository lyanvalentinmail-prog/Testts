import { categoryWithCounts, STATS } from '@velora/shared';
import { BookOpen, ChevronRight, Compass, Images, LayoutGrid, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Brand } from './Brand';
import { categoryIcon } from './Icons';
import { CATEGORY_ACCENT, cn } from '../lib/ui';
import type { HealthState } from '../lib/hooks';

const categories = categoryWithCounts();

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  health: HealthState;
}

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
  accent,
  onNavigate,
  end,
}: {
  to: string;
  icon: typeof Compass;
  label: string;
  badge?: string | number;
  accent?: string;
  onNavigate: () => void;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors',
          isActive
            ? 'bg-panel-3 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
            : 'text-ink-soft hover:bg-panel-2 hover:text-ink'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('size-4 shrink-0 transition-colors', isActive ? 'text-brand-soft' : 'text-faint group-hover:text-ink-soft')}
            strokeWidth={1.9}
          />
          <span className="truncate">{label}</span>
          {badge !== undefined && (
            <span
              className={cn(
                'ml-auto rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums',
                isActive ? 'bg-brand/15 text-brand-soft' : 'bg-panel-2 text-faint group-hover:text-muted'
              )}
            >
              {badge}
            </span>
          )}
          {accent && <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden />}
          <ChevronRight
            className={cn(
              'size-3.5 shrink-0 text-faint transition-all',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
            )}
          />
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ open, onClose, health }: SidebarProps) {
  const statusLabel =
    health.status === 'ok'
      ? 'API operativa'
      : health.status === 'loading'
        ? 'Comprobando…'
        : health.status === 'offline'
          ? 'API sin conexión'
          : 'Servicio degradado';
  const statusColor =
    health.status === 'ok' ? 'bg-emerald-400' : health.status === 'loading' ? 'bg-zinc-500' : 'bg-amber-400';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-line-soft bg-surface/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-panel-2 hover:text-ink lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4 pt-2">
          <div className="space-y-1">
            <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">Plataforma</p>
            <NavItem to="/" end icon={Compass} label="Inicio" onNavigate={onClose} />
            <NavItem to="/endpoints" icon={LayoutGrid} label="Todos los endpoints" badge={STATS.endpoints} onNavigate={onClose} />
            <NavItem to="/canvas" icon={Images} label="Galería de canvas" badge={STATS.canvases} onNavigate={onClose} />
            <NavItem to="/docs" icon={BookOpen} label="Guía de uso" onNavigate={onClose} />
          </div>

          <div className="space-y-1">
            <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">Categorías</p>
            {categories.map((category) => {
              const Icon = categoryIcon(category.icon);
              return (
                <NavItem
                  key={category.id}
                  to={`/c/${category.slug}`}
                  icon={Icon}
                  label={category.name}
                  badge={category.count}
                  accent={CATEGORY_ACCENT[category.id].hex}
                  onNavigate={onClose}
                />
              );
            })}
          </div>
        </nav>

        <div className="space-y-3 border-t border-line-soft p-3">
          <div className="rounded-xl border border-line-soft bg-panel/80 p-3">
            <div className="flex items-center gap-2 text-[12px] text-ink-soft">
              <span className={cn('relative flex size-2 rounded-full', statusColor)}>
                {health.status === 'ok' && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
              </span>
              {statusLabel}
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-faint">
              <span>{health.endpoints ?? STATS.endpoints} endpoints</span>
              <span>{health.canvases ?? STATS.canvases} canvas</span>
            </div>
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-faint">
            Plantillas originales de la carpeta <span className="text-muted">CategoriaCanvas</span> · Google Drive
          </p>
        </div>
      </aside>
    </>
  );
}
