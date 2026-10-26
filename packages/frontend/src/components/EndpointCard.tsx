import type { EndpointDef } from '@velora/shared';
import { ArrowUpRight, Clock, Image as ImageIcon, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORY_ACCENT, OUTPUT_LABEL, cn } from '../lib/ui';
import { MethodBadge } from './MethodBadge';

export function EndpointCard({ endpoint, compact = false }: { endpoint: EndpointDef; compact?: boolean }) {
  const accent = CATEGORY_ACCENT[endpoint.category];

  return (
    <Link
      to={`/e/${endpoint.id}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-line-soft bg-panel/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line hover:bg-panel-2 hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]',
        compact ? 'gap-2' : 'gap-2.5'
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent.hex}, transparent)` }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-2">
        <MethodBadge method={endpoint.method} size="sm" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted">{endpoint.path}</span>
        <ArrowUpRight className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <h3 className="text-[14px] font-medium leading-snug text-ink group-hover:text-white">{endpoint.name}</h3>
      {!compact && <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted">{endpoint.summary}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[10.5px] text-faint">
        <span className={cn('inline-flex items-center gap-1', accent.text)}>
          <span className="size-1.5 rounded-full" style={{ backgroundColor: accent.hex }} />
          {endpoint.category}
        </span>
        <span className="inline-flex items-center gap-1">
          {endpoint.output === 'image' ? <ImageIcon className="size-3" /> : null}
          {OUTPUT_LABEL[endpoint.output] ?? endpoint.output}
        </span>
        {endpoint.auth !== 'none' && (
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> API key
          </span>
        )}
        {endpoint.latency && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {endpoint.latency}
          </span>
        )}
      </div>
    </Link>
  );
}
