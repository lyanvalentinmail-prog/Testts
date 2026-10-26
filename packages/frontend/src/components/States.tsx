import { Loader2, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/ui';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} />;
}

export function LoadingBlock({ label = 'Cargando…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-[13px] text-muted">
        <Spinner /> {label}
      </p>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 rounded-xl border border-line-soft bg-panel/60 shimmer" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-14 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-xl border border-line-soft bg-panel-2 text-faint">
        {icon ?? <SearchX className="size-5" />}
      </div>
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toast({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' | 'ok' }) {
  const tones = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  };
  return <div className={cn('rounded-lg border px-3 py-2 text-[12.5px]', tones[tone])}>{children}</div>;
}
