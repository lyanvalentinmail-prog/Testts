import { useMemo } from 'react';
import { cn } from '../lib/ui';

const TOKEN = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

interface Part {
  text: string;
  kind: 'plain' | 'key' | 'string' | 'boolean' | 'null' | 'number';
}

function tokenize(json: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(json)) !== null) {
    if (match.index > last) parts.push({ text: json.slice(last, match.index), kind: 'plain' });
    if (match[1] !== undefined) {
      parts.push({ text: match[1], kind: 'key' });
      parts.push({ text: ':', kind: 'plain' });
    } else if (match[2] !== undefined) {
      parts.push({ text: match[2], kind: 'string' });
    } else if (match[3] !== undefined) {
      parts.push({ text: match[3], kind: 'boolean' });
    } else if (match[4] !== undefined) {
      parts.push({ text: match[4], kind: 'null' });
    } else if (match[5] !== undefined) {
      parts.push({ text: match[5], kind: 'number' });
    }
    last = TOKEN.lastIndex;
  }
  if (last < json.length) parts.push({ text: json.slice(last), kind: 'plain' });
  return parts;
}

const COLORS: Record<Part['kind'], string> = {
  plain: 'text-ink-soft/80',
  key: 'text-sky-300',
  string: 'text-emerald-300',
  boolean: 'text-amber-300',
  null: 'text-rose-300',
  number: 'text-violet-300',
};

export function JsonView({
  value,
  className,
  maxHeight = '26rem',
}: {
  value: unknown;
  className?: string;
  maxHeight?: string;
}) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  const parts = useMemo(() => tokenize(text), [text]);

  return (
    <pre
      className={cn('overflow-auto rounded-lg bg-[#080a0f] p-3.5 font-mono text-[12.5px] leading-relaxed', className)}
      style={{ maxHeight }}
    >
      <code>
        {parts.map((part, index) => (
          <span key={index} className={COLORS[part.kind]}>
            {part.text}
          </span>
        ))}
      </code>
    </pre>
  );
}
