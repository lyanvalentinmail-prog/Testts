import {
  buildPath,
  groupedParams,
  type EndpointDef,
  type ParamValue,
} from '@velora/shared';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Gauge,
  Link2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCodeSamples,
  formatBytes,
  formatMs,
  initialValues,
  isImageContentType,
  isVideoContentType,
  resolveMethod,
  runEndpoint,
  type ParamValues,
  type RunResult,
} from '../lib/api';
import { useCopy } from '../lib/hooks';
import { cn, methodStyle, statusTone } from '../lib/ui';
import { CodeBlock } from './CodeBlock';
import { JsonView } from './JsonView';
import { MethodBadge } from './MethodBadge';
import { ParamField } from './ParamField';
import { Spinner } from './States';

type Tab = 'response' | 'headers' | 'request';
type CodeTab = 'curl' | 'js' | 'py';

function extensionFor(contentType: string): string {
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('lrc') || contentType.includes('plain')) return 'txt';
  return 'bin';
}

function describeError(json: unknown): { code: string; message: string; hint?: string; details?: Array<{ parameter?: string; message?: string }> } | null {
  if (!json || typeof json !== 'object') return null;
  const envelope = json as { success?: boolean; error?: { code?: string; message?: string; hint?: string; details?: unknown } };
  if (envelope.success !== false || !envelope.error) return null;
  return {
    code: envelope.error.code ?? 'ERROR',
    message: envelope.error.message ?? 'La petición falló.',
    hint: envelope.error.hint,
    details: Array.isArray(envelope.error.details)
      ? (envelope.error.details as Array<{ parameter?: string; message?: string }>)
      : undefined,
  };
}

export function Playground({ endpoint }: { endpoint: EndpointDef }) {
  const [values, setValues] = useState<ParamValues>(() => initialValues(endpoint));
  const [files, setFiles] = useState<Record<string, File>>({});
  const [rawBody, setRawBody] = useState(() =>
    endpoint.requestBody ? JSON.stringify(endpoint.requestBody.example, null, 2) : ''
  );
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('response');
  const [codeTab, setCodeTab] = useState<CodeTab>('curl');
  const [showCode, setShowCode] = useState(false);
  const { copied, copy } = useCopy();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValues(initialValues(endpoint));
    setFiles({});
    setRawBody(endpoint.requestBody ? JSON.stringify(endpoint.requestBody.example, null, 2) : '');
    setResult(null);
    setFormError(null);
    setTab('response');
    setShowCode(false);
  }, [endpoint]);

  useEffect(() => {
    if (result) {
      const current = result;
      return () => {
        if (current.objectUrl) URL.revokeObjectURL(current.objectUrl);
      };
    }
    return undefined;
  }, [result]);

  const groups = useMemo(
    () => groupedParams(endpoint.params).filter((group) => group.params.length > 0),
    [endpoint]
  );

  const uploadEnabled = Boolean(endpoint.altMethods?.includes('POST'));
  const hasBodyParams = endpoint.params.some((param) => param.in === 'body');
  const showJsonBody = Boolean(endpoint.requestBody) && !hasBodyParams && !uploadEnabled;
  const bodyError = (() => {
    if (!showJsonBody || !rawBody.trim()) return null;
    try {
      JSON.parse(rawBody);
      return null;
    } catch (error) {
      return `JSON inválido: ${(error as Error).message}`;
    }
  })();
  const method = resolveMethod({ def: endpoint, values, files });
  const url = `${buildPath(endpoint.path, values)}${(() => {
    const params = new URLSearchParams();
    for (const param of endpoint.params) {
      if (param.in !== 'query') continue;
      const value = values[param.name];
      if (value === undefined || value === '' || value === param.default) continue;
      params.set(param.name, String(value));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  })()}`;

  const missing = endpoint.params.filter(
    (param) =>
      param.required &&
      !files[param.name] &&
      (values[param.name] === undefined || values[param.name] === '')
  );

  async function execute() {
    if (missing.length) {
      setFormError(`Completa los campos obligatorios: ${missing.map((param) => param.name).join(', ')}.`);
      return;
    }
    if (showJsonBody && bodyError) {
      setFormError('Corrige el JSON del cuerpo antes de enviar la petición.');
      return;
    }
    setFormError(null);
    setRunning(true);
    setTab('response');
    const response = await runEndpoint({
      def: endpoint,
      values,
      files,
      ...(showJsonBody ? { rawBody } : {}),
    });
    setResult(response);
    setRunning(false);
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function update(name: string, value: ParamValue | undefined) {
    setValues((current) => {
      const next = { ...current };
      if (value === undefined || value === '') delete next[name];
      else next[name] = value;
      return next;
    });
  }

  const codeSamples = useMemo(
    () => buildCodeSamples(endpoint, values, files, showJsonBody ? rawBody : undefined),
    [endpoint, values, files, showJsonBody, rawBody]
  );
  const errorInfo = result ? describeError(result.json) : null;
  const tone = result ? statusTone(result.status) : null;
  const filename = `velora-${endpoint.id.replace(/[^a-z0-9]+/gi, '-')}.${extensionFor(result?.contentType ?? '')}`;

  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-2xl border border-line-soft bg-panel/70">
        <header className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-panel-2/40 px-4 py-3">
          <span className="grid size-6 place-items-center rounded-md bg-brand/15 text-brand-soft">
            <Terminal className="size-3.5" />
          </span>
          <h2 className="text-[13.5px] font-semibold text-ink">Consola de pruebas</h2>
          <span className="ml-auto flex items-center gap-1.5 rounded-md border border-line-soft bg-panel px-2 py-1 font-mono text-[10.5px] text-muted">
            <MethodBadge method={method} size="sm" />
            <span className="max-w-[190px] truncate">{url}</span>
          </span>
        </header>

        <div className="space-y-4 p-4">
          {groups.map((group) => (
            <fieldset key={group.group} className="space-y-3">
              <legend className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
                {group.group}
              </legend>
              {group.params.map((param) => (
                <ParamField
                  key={param.name}
                  param={param}
                  value={values[param.name]}
                  onChange={(value) => update(param.name, value)}
                  file={files[param.name]}
                  onFile={(file) =>
                    setFiles((current) => {
                      const next = { ...current };
                      if (file) next[param.name] = file;
                      else delete next[param.name];
                      return next;
                    })
                  }
                  allowUpload={uploadEnabled}
                />
              ))}
            </fieldset>
          ))}

          {showJsonBody && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="raw-body" className="text-[12.5px] font-medium text-ink-soft">
                  Cuerpo de la petición <span className="font-mono text-[11px] text-faint">application/json</span>
                </label>
                <span className="text-[10.5px] text-faint">
                  {endpoint.requestBody?.required ? 'obligatorio' : 'opcional'}
                </span>
              </div>
              <textarea
                id="raw-body"
                value={rawBody}
                onChange={(event) => setRawBody(event.target.value)}
                rows={9}
                spellCheck={false}
                className={cn(
                  'w-full resize-y rounded-lg border bg-[#080a0f] p-3 font-mono text-[12px] leading-relaxed text-ink-soft outline-none',
                  bodyError ? 'border-rose-500/50' : 'border-line focus:border-brand/60'
                )}
              />
              {bodyError ? (
                <p className="mt-1 text-[11px] text-rose-300">{bodyError}</p>
              ) : (
                <p className="mt-1 text-[11px] text-faint">
                  {endpoint.requestBody?.description}
                </p>
              )}
            </div>
          )}

          {uploadEnabled && (
            <p className="flex items-start gap-1.5 rounded-lg border border-line-soft bg-panel-2/40 px-2.5 py-2 text-[11px] leading-relaxed text-faint">
              <Zap className="mt-0.5 size-3 shrink-0 text-brand-soft" />
              También puedes enviar una imagen local: se usará <code className="font-mono text-muted">POST multipart</code>,
              una alternativa documentada del mismo endpoint.
            </p>
          )}

          {formError && (
            <p className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-[12px] text-rose-200">
              <AlertTriangle className="size-3.5 shrink-0" /> {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void execute()}
              disabled={running}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-b from-violet-500 to-indigo-600 px-3.5 text-[12.5px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(124,92,255,0.9)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <Spinner className="size-3.5" /> : <Play className="size-3.5" />}
              {running ? 'Ejecutando…' : 'Probar endpoint'}
            </button>
            <button
              type="button"
              onClick={() => void copy(url, 'url')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-2/60 px-3 text-[12px] text-ink-soft transition-colors hover:bg-panel-2 hover:text-ink"
            >
              {copied === 'url' ? <Check className="size-3.5 text-emerald-400" /> : <Link2 className="size-3.5" />}
              {copied === 'url' ? 'URL copiada' : 'Copiar URL'}
            </button>
            <button
              type="button"
              onClick={() => {
                setValues(initialValues(endpoint));
                setFiles({});
                setRawBody(endpoint.requestBody ? JSON.stringify(endpoint.requestBody.example, null, 2) : '');
                setResult(null);
                setFormError(null);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-soft px-3 text-[12px] text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> Restablecer
            </button>
          </div>

          {endpoint.examples.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
              <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-wide text-faint">
                <Sparkles className="size-3" /> Ejemplos
              </span>
              {endpoint.examples.slice(0, 4).map((example) => (
                <button
                  key={example.label}
                  type="button"
                  title={example.description}
                  onClick={() => {
                    if (example.params) {
                      setValues({ ...initialValues(endpoint), ...example.params });
                      setFormError(null);
                    }
                  }}
                  className="rounded-full border border-line-soft bg-panel-2/50 px-2.5 py-0.5 text-[11px] text-ink-soft transition-colors hover:border-brand/40 hover:text-ink"
                >
                  {example.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section ref={resultRef} className="overflow-hidden rounded-2xl border border-line-soft bg-panel/70">
        <header className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-panel-2/40 px-3 py-2">
          {(['response', 'headers', 'request'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                tab === item ? 'bg-brand/15 text-brand-soft' : 'text-muted hover:bg-panel-2 hover:text-ink-soft'
              )}
            >
              {item === 'response' ? 'Respuesta' : item === 'headers' ? 'Encabezados' : 'Solicitud'}
            </button>
          ))}
          {result && !running && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
              <span className={cn('rounded-md border px-1.5 py-0.5 font-semibold', tone?.text, tone?.bg, tone?.border)}>
                {result.status === 0 ? 'ERR' : result.status} {result.statusText}
              </span>
              <span className="rounded-md border border-line-soft bg-panel px-1.5 py-0.5 text-muted">{formatMs(result.durationMs)}</span>
              {result.size > 0 && (
                <span className="rounded-md border border-line-soft bg-panel px-1.5 py-0.5 text-muted">{formatBytes(result.size)}</span>
              )}
            </div>
          )}
        </header>

        <div className="p-3.5">
          {running && (
            <div className="space-y-2 py-6" role="status" aria-live="polite">
              <p className="flex items-center justify-center gap-2 text-[13px] text-muted">
                <Spinner /> Generando la respuesta…
              </p>
              <div className="mx-auto h-2 w-40 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full w-1/3 rounded-full bg-brand/70 shimmer" />
              </div>
            </div>
          )}

          {!running && !result && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid size-9 place-items-center rounded-xl border border-line-soft bg-panel-2 text-faint">
                <Gauge className="size-4" />
              </span>
              <p className="text-[12.5px] text-muted">
                Ajusta los parámetros y pulsa <span className="text-ink-soft">Probar endpoint</span>.
              </p>
              <p className="font-mono text-[11px] text-faint">{endpoint.path}</p>
            </div>
          )}

          {!running && result && tab === 'response' && (
            <div className="space-y-3">
              {result.error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[12.5px] text-rose-200">
                  <FileWarning className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-medium">No se pudo completar la petición</p>
                    <p className="mt-0.5 text-rose-200/80">{result.error}</p>
                  </div>
                </div>
              )}

              {errorInfo && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-200">
                    <AlertTriangle className="size-3.5" /> {errorInfo.code}
                  </p>
                  <p className="mt-1 text-[12.5px] text-amber-100/90">{errorInfo.message}</p>
                  {errorInfo.hint && <p className="mt-1 text-[11.5px] text-amber-200/70">{errorInfo.hint}</p>}
                  {errorInfo.details && errorInfo.details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {errorInfo.details.map((detail, index) => (
                        <li key={index} className="font-mono text-[11px] text-amber-200/80">
                          {detail.parameter ? `${detail.parameter}: ` : ''}
                          {detail.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {result.objectUrl && (isImageContentType(result.contentType) || isVideoContentType(result.contentType)) && (
                <div className="overflow-hidden rounded-xl border border-line-soft bg-[#07080c]">
                  {isVideoContentType(result.contentType) ? (
                    <video src={result.objectUrl} controls className="mx-auto max-h-[380px] w-full" />
                  ) : (
                    <img
                      src={result.objectUrl}
                      alt={`Resultado de ${endpoint.name}`}
                      className="mx-auto max-h-[380px] w-auto max-w-full object-contain"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line-soft bg-panel-2/40 px-2.5 py-2">
                    <span className="font-mono text-[10.5px] text-faint">{result.contentType}</span>
                    <a
                      href={result.objectUrl}
                      download={filename}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-1 text-[11.5px] text-ink-soft hover:text-ink"
                    >
                      <Download className="size-3" /> Descargar {extensionFor(result.contentType).toUpperCase()}
                    </a>
                    <a
                      href={result.requestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-line-soft px-2 py-1 text-[11.5px] text-muted hover:text-ink"
                    >
                      <ExternalLink className="size-3" /> Abrir
                    </a>
                  </div>
                </div>
              )}

              {result.json !== undefined && (
                <div className="overflow-hidden rounded-xl border border-line-soft">
                  <div className="flex items-center justify-between border-b border-line-soft bg-panel-2/40 px-2.5 py-1.5">
                    <span className="font-mono text-[10.5px] text-faint">application/json</span>
                    <button
                      type="button"
                      onClick={() => void copy(JSON.stringify(result.json, null, 2), 'json')}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:text-ink"
                    >
                      {copied === 'json' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                      {copied === 'json' ? 'Copiado' : 'Copiar JSON'}
                    </button>
                  </div>
                  <JsonView value={result.json} maxHeight="26rem" />
                </div>
              )}

              {result.json === undefined && !result.objectUrl && result.text !== undefined && (
                <div className="overflow-hidden rounded-xl border border-line-soft">
                  <pre className="max-h-[26rem] overflow-auto bg-[#080a0f] p-3.5 font-mono text-[12px] leading-relaxed text-ink-soft">
                    {result.text || '(respuesta vacía)'}
                  </pre>
                </div>
              )}

              {result.blob && !isImageContentType(result.contentType) && !isVideoContentType(result.contentType) && (
                <a
                  href={result.objectUrl}
                  download={filename}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-[12px] text-ink-soft hover:text-ink"
                >
                  <Download className="size-3.5" /> Descargar archivo ({formatBytes(result.size)})
                </a>
              )}
            </div>
          )}

          {!running && result && tab === 'headers' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-panel-2/40 px-2.5 py-2 text-[11.5px]">
                <MethodBadge method={result.requestMethod} size="sm" />
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">{result.requestUrl}</span>
              </div>
              <div className="divide-y divide-line-soft overflow-hidden rounded-lg border border-line-soft">
                {Object.entries(result.headers).length === 0 && (
                  <p className="px-3 py-2 text-[12px] text-faint">Sin encabezados registrados.</p>
                )}
                {Object.entries(result.headers).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,180px)_1fr] gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="truncate font-mono text-sky-300/90">{key}</span>
                    <span className="break-all font-mono text-ink-soft/80">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!running && result && tab === 'request' && (
            <div className="space-y-2">
              <div className="rounded-lg border border-line-soft bg-panel-2/40 p-2.5">
                <p className="mb-1 text-[10.5px] uppercase tracking-wide text-faint">Petición enviada</p>
                <div className="flex items-center gap-2">
                  <MethodBadge method={result.requestMethod} size="sm" />
                  <code className="min-w-0 flex-1 break-all font-mono text-[11.5px] text-ink-soft">{result.requestUrl}</code>
                </div>
              </div>
              {Object.keys(files).length > 0 && (
                <div className="rounded-lg border border-line-soft bg-panel-2/40 p-2.5">
                  <p className="mb-1 text-[10.5px] uppercase tracking-wide text-faint">Archivos (multipart)</p>
                  {Object.entries(files).map(([name, file]) => (
                    <p key={name} className="font-mono text-[11.5px] text-ink-soft">
                      {name}: {file.name} · {formatBytes(file.size)}
                    </p>
                  ))}
                </div>
              )}
              {showJsonBody && (
                <div className="overflow-hidden rounded-lg border border-line-soft">
                  <p className="border-b border-line-soft bg-panel-2/40 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wide text-faint">
                    Cuerpo JSON enviado
                  </p>
                  <pre className="max-h-[14rem] overflow-auto bg-[#080a0f] p-3 font-mono text-[11.5px] text-ink-soft">{rawBody}</pre>
                </div>
              )}
              {hasBodyParams && (
                <div className="overflow-hidden rounded-lg border border-line-soft">
                  <p className="border-b border-line-soft bg-panel-2/40 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wide text-faint">
                    Cuerpo JSON
                  </p>
                  <JsonView
                    value={Object.fromEntries(
                      endpoint.params.filter((param) => param.in === 'body').map((param) => [param.name, values[param.name] ?? null])
                    )}
                    maxHeight="14rem"
                  />
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-line-soft">
                <p className="border-b border-line-soft bg-panel-2/40 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wide text-faint">
                  Ejemplos del catálogo
                </p>
                <div className="space-y-1.5 p-2.5">
                  {endpoint.examples.map((example) => (
                    <div key={example.label} className="text-[11.5px]">
                      <p className="font-medium text-ink-soft">{example.label}</p>
                      <p className="text-faint">{example.description ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line-soft bg-panel/70">
        <button
          type="button"
          onClick={() => setShowCode((show) => !show)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <span className="grid size-6 place-items-center rounded-md bg-panel-2 text-faint">
            <Terminal className="size-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-ink">Código de ejemplo</span>
          <span className="ml-auto flex items-center gap-2 text-[11px] text-faint">
            cURL · JavaScript · Python
            <ChevronDown className={cn('size-3.5 transition-transform', showCode && 'rotate-180')} />
          </span>
        </button>
        {showCode && (
          <div className="border-t border-line-soft p-3">
            <div className="mb-2 flex gap-1">
              {(['curl', 'js', 'py'] as CodeTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCodeTab(item)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11.5px] transition-colors',
                    codeTab === item ? 'bg-brand/15 text-brand-soft' : 'text-muted hover:bg-panel-2 hover:text-ink-soft'
                  )}
                >
                  {item === 'curl' ? 'cURL' : item === 'js' ? 'JavaScript' : 'Python'}
                </button>
              ))}
              <span className={cn('ml-auto self-center rounded px-1.5 py-0.5 font-mono text-[10px]', methodStyle(method).text)}>
                {method}
              </span>
            </div>
            <CodeBlock
              code={codeTab === 'curl' ? codeSamples.curl : codeTab === 'js' ? codeSamples.javascript : codeSamples.python}
              filename={codeTab === 'curl' ? 'peticion.sh' : codeTab === 'js' ? 'peticion.mjs' : 'peticion.py'}
              maxHeight="16rem"
            />
          </div>
        )}
      </section>
    </div>
  );
}
