import { Check, Copy } from 'lucide-react';
import { useCopy } from '../lib/hooks';
import { cn } from '../lib/ui';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  maxHeight?: string;
  actions?: React.ReactNode;
}

export function CodeBlock({ code, language, filename, className, maxHeight = '22rem', actions }: CodeBlockProps) {
  const { copied, copy } = useCopy();

  return (
    <div className={cn('overflow-hidden rounded-xl border border-line-soft bg-[#080a0f]', className)}>
      <div className="flex items-center gap-2 border-b border-line-soft bg-panel/70 px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500/70" />
          <span className="size-2 rounded-full bg-amber-500/70" />
          <span className="size-2 rounded-full bg-emerald-500/70" />
        </span>
        <span className="ml-1 truncate font-mono text-[11px] text-faint">{filename ?? language ?? 'código'}</span>
        <div className="ml-auto flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={() => void copy(code, 'code')}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-panel-2 hover:text-ink"
          >
            {copied === 'code' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
            {copied === 'code' ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <pre
        className="overflow-auto p-3.5 text-[12.5px] leading-relaxed"
        style={{ maxHeight }}
      >
        <code className="font-mono text-ink-soft">{code}</code>
      </pre>
    </div>
  );
}
