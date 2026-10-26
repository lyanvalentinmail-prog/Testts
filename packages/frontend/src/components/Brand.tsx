import { Link } from 'react-router-dom';
import { cn } from '../lib/ui';

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 shadow-[0_6px_20px_-6px_rgba(124,92,255,0.9)]',
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5 12 19l8-13.5" />
      </svg>
    </span>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-ink">
          Velora<span className="text-brand-soft"> API</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.14em] text-faint">
            explorador · v1.0
          </span>
        )}
      </span>
    </Link>
  );
}
