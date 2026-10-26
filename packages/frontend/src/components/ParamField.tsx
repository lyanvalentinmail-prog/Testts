import type { ParamDef, ParamValue } from '@velora/shared';
import { ImagePlus, Link2, Upload, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { formatBytes } from '../lib/api';
import { cn } from '../lib/ui';

interface ParamFieldProps {
  param: ParamDef;
  value: ParamValue | undefined;
  onChange: (value: ParamValue | undefined) => void;
  file?: File;
  onFile: (file: File | undefined) => void;
  allowUpload: boolean;
  error?: string;
}

const inputClass =
  'w-full rounded-lg border border-line bg-panel-2/70 px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/60 focus:bg-panel-2';

function Label({ param, htmlFor }: { param: ParamDef; htmlFor: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft">
        <code className="font-mono text-[12px] text-ink">{param.name}</code>
        {param.required && <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-400/90">req</span>}
        <span className="rounded bg-panel-2 px-1 py-px font-mono text-[9.5px] uppercase text-faint">{param.type}</span>
      </label>
      {param.default !== undefined && param.default !== '' && (
        <span className="shrink-0 font-mono text-[10px] text-faint">def: {String(param.default).slice(0, 22)}</span>
      )}
    </div>
  );
}

export function ParamField({ param, value, onChange, file, onFile, allowUpload, error }: ParamFieldProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlPreviewFailed, setUrlPreviewFailed] = useState(false);
  const stringValue = value === undefined || value === null ? '' : String(value);
  const showUpload = allowUpload && (param.type === 'image' || param.type === 'file' || param.widget === 'file');
  const isUrlLike = stringValue.startsWith('http://') || stringValue.startsWith('https://');

  return (
    <div>
      <Label param={param} htmlFor={id} />

      <div className="flex gap-2">
        {param.type === 'enum' && param.enumValues ? (
          <select
            id={id}
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            className={cn(inputClass, 'appearance-none pr-8')}
          >
            {!param.required && <option value="">— sin especificar —</option>}
            {param.enumValues.map((option) => (
              <option key={option} value={option} className="bg-panel">
                {option}
              </option>
            ))}
          </select>
        ) : param.type === 'boolean' || param.widget === 'toggle' ? (
          <button
            type="button"
            id={id}
            role="switch"
            aria-checked={value === true}
            onClick={() => onChange(value === true ? false : true)}
            className={cn(
              'flex h-9 w-full items-center gap-2.5 rounded-lg border px-2.5 text-left text-[12.5px] transition-colors',
              value === true
                ? 'border-brand/40 bg-brand/10 text-brand-soft'
                : 'border-line bg-panel-2/60 text-muted hover:bg-panel-2'
            )}
          >
            <span
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                value === true ? 'bg-brand' : 'bg-panel-3'
              )}
            >
              <span
                className={cn(
                  'absolute size-3.5 rounded-full bg-white transition-transform',
                  value === true ? 'translate-x-[18px]' : 'translate-x-1'
                )}
              />
            </span>
            {value === true ? 'Activado' : 'Desactivado'}
          </button>
        ) : param.widget === 'slider' || (param.type === 'integer' && param.minimum !== undefined && param.maximum !== undefined) ? (
          <div className="flex w-full items-center gap-3">
            <input
              id={id}
              type="range"
              min={param.minimum ?? 0}
              max={param.maximum ?? 100}
              step={param.step ?? 1}
              value={Number(value ?? param.default ?? param.minimum ?? 0)}
              onChange={(event) => onChange(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-panel-3 accent-violet-500"
            />
            <input
              type="number"
              min={param.minimum}
              max={param.maximum}
              step={param.step ?? 1}
              value={Number(value ?? param.default ?? param.minimum ?? 0)}
              onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
              className={cn(inputClass, 'w-20 shrink-0 px-2 py-1 text-center font-mono text-[12px]')}
            />
          </div>
        ) : param.type === 'color' || param.widget === 'color' ? (
          <div className="flex w-full gap-2">
            <input
              id={id}
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(stringValue) ? stringValue : '#ffffff'}
              onChange={(event) => onChange(event.target.value)}
              className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-panel-2 p-1"
              aria-label={`Selector de color para ${param.name}`}
            />
            <input
              value={stringValue}
              onChange={(event) => onChange(event.target.value)}
              placeholder={String(param.example ?? '#ffffff')}
              className={cn(inputClass, 'font-mono text-[12.5px]')}
              spellCheck={false}
            />
          </div>
        ) : param.widget === 'textarea' || param.type === 'text' || param.type === 'json' ? (
          <textarea
            id={id}
            rows={param.type === 'json' ? 4 : 2}
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder={String(param.example ?? param.description ?? '')}
            className={cn(inputClass, 'resize-y font-sans leading-relaxed')}
          />
        ) : (
          <input
            id={id}
            type="text"
            inputMode={param.type === 'number' || param.type === 'integer' ? 'numeric' : 'text'}
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder={String(param.example ?? param.description ?? '')}
            className={cn(inputClass, (param.type === 'url' || param.type === 'image') && 'font-mono text-[12px]')}
            spellCheck={false}
            autoComplete="off"
          />
        )}

        {showUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={param.accept ?? 'image/png,image/jpeg,image/webp,image/gif'}
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                onFile(picked);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel-2/70 px-2.5 text-[12px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
              title="Subir una imagen local (se enviará por POST multipart)"
            >
              <Upload className="size-3.5" />
              Subir
            </button>
          </>
        )}
      </div>

      {file && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/5 px-2.5 py-1.5 text-[11.5px] text-ink-soft">
          <ImagePlus className="size-3.5 shrink-0 text-brand-soft" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-faint">{formatBytes(file.size)}</span>
          <button
            type="button"
            onClick={() => onFile(undefined)}
            className="grid size-5 place-items-center rounded text-muted hover:bg-panel-3 hover:text-ink"
            aria-label="Quitar archivo"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {param.description && <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{param.description}</p>}

      {showUpload && isUrlLike && !file && !urlPreviewFailed && param.type === 'image' && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-line-soft bg-panel/50 p-1.5">
          <img
            src={stringValue}
            alt=""
            className="size-10 rounded object-cover"
            loading="lazy"
            onError={() => setUrlPreviewFailed(true)}
          />
          <span className="flex items-center gap-1 text-[11px] text-faint">
            <Link2 className="size-3" /> vista previa de la URL
          </span>
        </div>
      )}

      {error && <p className="mt-1 text-[11.5px] text-rose-300">{error}</p>}
    </div>
  );
}
