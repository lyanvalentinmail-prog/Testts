import type { HttpMethod } from '@velora/shared';
import { cn, methodStyle } from '../lib/ui';

export function MethodBadge({
  method,
  size = 'md',
  className,
}: {
  method: HttpMethod | string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const style = methodStyle(method);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-mono font-semibold uppercase tracking-wide',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        style.text,
        style.bg,
        style.border,
        className
      )}
    >
      {String(method).toUpperCase()}
    </span>
  );
}
