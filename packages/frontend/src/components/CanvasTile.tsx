import { CANVAS_GROUPS, type CanvasDef } from '@velora/shared';
import { ArrowUpRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/ui';

export function CanvasTile({ canvas, compact = false }: { canvas: CanvasDef; compact?: boolean }) {
  return (
    <Link
      to={`/e/canvas.${canvas.slug}`}
      className="group overflow-hidden rounded-xl border border-line-soft bg-panel/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-panel-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0d12]">
        <img
          src={`/api/canvas/${canvas.slug}/preview`}
          alt={`Vista previa de ${canvas.title}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute right-2 top-2 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/75 backdrop-blur">
          {canvas.width}×{canvas.height}
        </span>
        {canvas.media === 'video' && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[10px] text-white/75 backdrop-blur">
            <Play className="size-2.5" /> animado
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-6 text-[10.5px] text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
          Probar en el explorador
          <ArrowUpRight className="size-3" />
        </span>
      </div>
      <div className={cn('p-3', compact && 'p-2.5')}>
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[13px] font-medium text-ink">{canvas.title}</h3>
          <span className="ml-auto shrink-0 rounded bg-panel-2 px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide text-faint">
            {CANVAS_GROUPS[canvas.group].label.split(' ')[0]}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-faint">{canvas.description}</p>
      </div>
    </Link>
  );
}
