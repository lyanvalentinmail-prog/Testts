import {
  CATEGORY_BY_ID,
  ENDPOINTS_BY_ID,
  groupedParams,
  type ParamDef,
} from '@velora/shared';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Code2,
  ExternalLink,
  Image as ImageIcon,
  Lock,
  LockOpen,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { EmptyState } from '../components/States';
import { JsonView } from '../components/JsonView';
import { MethodBadge } from '../components/MethodBadge';
import { Playground } from '../components/Playground';
import { buildCodeSamples, initialValues } from '../lib/api';
import { responseExample } from '../lib/examples';
import { useCopy } from '../lib/hooks';
import { CATEGORY_ACCENT, OUTPUT_LABEL, cn } from '../lib/ui';

function ParamTable({ params }: { params: ParamDef[] }) {
  if (params.length === 0) {
    return <p className="text-[12.5px] text-faint">Este endpoint no recibe parámetros.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line-soft">
      <table className="w-full border-collapse text-left text-[12px]">
        <thead className="bg-panel-2/60 text-[10.5px] uppercase tracking-wide text-faint">
          <tr>
            <th className="px-3 py-2 font-medium">Parámetro</th>
            <th className="px-3 py-2 font-medium">Tipo</th>
            <th className="px-3 py-2 font-medium">Requerido</th>
            <th className="px-3 py-2 font-medium">Default</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {params.map((param) => (
            <tr key={`${param.in}-${param.name}`} className="align-top">
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <code className="font-mono text-[12px] text-ink">{param.name}</code>
                  <span className="rounded bg-panel-2 px-1 py-px font-mono text-[9.5px] uppercase text-faint">{param.in}</span>
                </div>
                <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-muted">{param.description}</p>
                {param.enumValues && (
                  <p className="mt-1 font-mono text-[10.5px] text-faint">valores: {param.enumValues.join(' · ')}</p>
                )}
                {param.aliases && param.aliases.length > 0 && (
                  <p className="mt-0.5 font-mono text-[10px] text-faint">alias: {param.aliases.join(', ')}</p>
                )}
              </td>
              <td className="px-3 py-2.5">
                <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft">{param.type}</span>
                {(param.minimum !== undefined || param.maximum !== undefined || param.maxLength !== undefined) && (
                  <p className="mt-1 text-[10.5px] text-faint">
                    {param.minimum !== undefined && `min ${param.minimum}`}
                    {param.minimum !== undefined && (param.maximum !== undefined || param.maxLength !== undefined) ? ' · ' : ''}
                    {param.maximum !== undefined && `max ${param.maximum}`}
                    {param.maxLength !== undefined && `largo ≤ ${param.maxLength}`}
                  </p>
                )}
              </td>
              <td className="px-3 py-2.5">
                {param.required ? (
                  <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">sí</span>
                ) : (
                  <span className="text-[11px] text-faint">no</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-mono text-[10.5px] text-muted">
                {param.default === undefined ? '—' : String(param.default)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EndpointPage() {
  const { id = '' } = useParams<{ id: string }>();
  const endpoint = ENDPOINTS_BY_ID[id];
  const { copied, copy } = useCopy();

  const examples = useMemo(() => {
    if (!endpoint) return null;
    const first = endpoint.examples[0];
    const values = { ...initialValues(endpoint), ...(first?.params ?? {}) };
    return buildCodeSamples(endpoint, values);
  }, [endpoint]);

  const sample = endpoint ? responseExample(endpoint.id) : null;

  if (!endpoint) {
    return (
      <EmptyState
        title="Endpoint no encontrado"
        description="El identificador no existe en el catálogo. Puede que se haya renombrado o que el enlace esté mal escrito."
        action={
          <Link
            to="/endpoints"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-[12px] text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Volver al catálogo
          </Link>
        }
      />
    );
  }

  const category = CATEGORY_BY_ID[endpoint.category];
  const accent = CATEGORY_ACCENT[endpoint.category];
  const paramGroups = groupedParams(endpoint.params.filter((param) => param.in !== 'path'));
  const pathParams = endpoint.params.filter((param) => param.in === 'path');

  return (
    <div className="space-y-6 animate-in">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        <Link to="/endpoints" className="hover:text-ink">
          Catálogo
        </Link>
        <span className="text-faint">/</span>
        <Link to={`/c/${category?.slug ?? endpoint.category}`} className={cn('hover:text-ink', accent.text)}>
          {category?.name ?? endpoint.category}
        </Link>
        <span className="text-faint">/</span>
        <span className="truncate text-faint">{endpoint.name}</span>
      </nav>

      <header className="rounded-2xl border border-line-soft bg-panel/60 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <button
            type="button"
            onClick={() => void copy(endpoint.path, 'path')}
            className="group inline-flex items-center gap-1.5 rounded-md border border-line-soft bg-panel-2/60 px-2 py-1 font-mono text-[11.5px] text-ink-soft hover:text-ink"
            title="Copiar ruta"
          >
            {endpoint.path}
            {copied === 'path' ? <Check className="size-3 text-emerald-400" /> : <Code2 className="size-3 text-faint" />}
          </button>
          {endpoint.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10.5px] text-amber-200">
              <Sparkles className="size-2.5" /> destacado
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2 py-0.5 text-[10.5px] text-muted">
            {endpoint.auth === 'none' ? <LockOpen className="size-2.5" /> : <Lock className="size-2.5" />}
            {endpoint.auth === 'none' ? 'sin autenticación' : 'API key'}
          </span>
        </div>

        <h1 className="mt-3 text-balance text-[25px] font-semibold tracking-tight text-white sm:text-[29px]">{endpoint.name}</h1>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink-soft">{endpoint.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <ImageIcon className="size-3.5" /> Salida: <span className="text-ink-soft">{OUTPUT_LABEL[endpoint.output] ?? endpoint.output}</span>
          </span>
          {endpoint.latency && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> Latencia <span className="text-ink-soft">{endpoint.latency}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Validación de parámetros y rate limit
          </span>
          {endpoint.altMethods?.includes('POST') && (
            <span className="inline-flex items-center gap-1.5 text-brand-soft/90">
              <Terminal className="size-3.5" /> admite POST multipart
            </span>
          )}
          {endpoint.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-6">
          {endpoint.canvas && (
            <section className="overflow-hidden rounded-2xl border border-line-soft bg-panel/60">
              <div className="flex items-center justify-between border-b border-line-soft px-4 py-2.5">
                <h2 className="text-[13px] font-semibold text-ink">Vista previa de la plantilla</h2>
                <span className="font-mono text-[10.5px] text-faint">
                  {endpoint.canvas.width}×{endpoint.canvas.height} px · {endpoint.canvas.template}
                </span>
              </div>
              <div className="bg-[#0a0c11] p-3">
                <img
                  src={endpoint.canvas.preview}
                  alt={`Plantilla del canvas ${endpoint.canvas.title}`}
                  loading="lazy"
                  className="mx-auto max-h-[340px] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-4 py-2.5 text-[11.5px] text-faint">
                <span>
                  Archivo original: <span className="font-mono text-muted">{endpoint.source?.note?.match(/[a-z0-9-]+\.(?:jpg|png)/i)?.[0] ?? 'plantilla'}</span>
                </span>
                <Link to="/canvas" className="inline-flex items-center gap-1 text-brand-soft/90 hover:text-brand-soft">
                  Ver galería <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-ink">Descripción</h2>
            <p className="text-[13px] leading-relaxed text-muted">{endpoint.description}</p>
            {endpoint.notes && endpoint.notes.length > 0 && (
              <ul className="mt-2 space-y-1.5 rounded-xl border border-line-soft bg-panel/50 p-3">
                {endpoint.notes.map((note) => (
                  <li key={note} className="flex gap-2 text-[11.5px] leading-relaxed text-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-soft/70" />
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {pathParams.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-semibold text-ink">Parámetros de ruta</h2>
              <ParamTable params={pathParams} />
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">Parámetros</h2>
              <span className="font-mono text-[10.5px] text-faint">{endpoint.params.length} en total</span>
            </div>
            {paramGroups.length === 0 ? (
              <p className="text-[12.5px] text-faint">Este endpoint no recibe parámetros.</p>
            ) : (
              paramGroups.map((group) => (
                <div key={group.group} className="space-y-1.5">
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">{group.group}</p>
                  <ParamTable params={group.params} />
                </div>
              ))
            )}
          </section>

          {endpoint.requestBody && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">Cuerpo de la petición</h2>
                <span className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">{endpoint.requestBody.contentType}</span>
              </div>
              <p className="text-[12.5px] text-muted">{endpoint.requestBody.description}</p>
              <CodeBlock code={JSON.stringify(endpoint.requestBody.example, null, 2)} filename="body.json" maxHeight="14rem" />
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-[15px] font-semibold text-ink">Códigos de estado</h2>
            <div className="overflow-hidden rounded-xl border border-line-soft">
              <table className="w-full border-collapse text-left text-[12px]">
                <thead className="bg-panel-2/60 text-[10.5px] uppercase tracking-wide text-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Descripción</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {endpoint.responses.map((response) => (
                    <tr key={response.status}>
                      <td className="px-3 py-2 font-mono text-[11.5px] text-ink-soft">{response.status}</td>
                      <td className="px-3 py-2 text-[11.5px] text-muted">{response.description}</td>
                      <td className="px-3 py-2 font-mono text-[10.5px] text-faint">{response.kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {endpoint.output === 'json' && sample !== null && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-ink">Respuesta de ejemplo</h2>
                <span className="rounded-full border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-faint">200 · JSON</span>
              </div>
              <div className="overflow-hidden rounded-xl border border-line-soft">
                <JsonView value={sample} maxHeight="24rem" />
              </div>
              <p className="text-[10.5px] text-faint">
                Ejemplo ilustrativo con la forma real del sobre <code className="font-mono">success/data/meta</code>. Pulsa
                «Probar endpoint» para obtener datos en vivo.
              </p>
            </section>
          )}

          {endpoint.output !== 'json' && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-semibold text-ink">Respuesta</h2>
              <div className="flex items-start gap-2 rounded-xl border border-line-soft bg-panel/50 p-3 text-[12px] text-muted">
                <ImageIcon className="mt-0.5 size-4 shrink-0 text-brand-soft" />
                <p>
                  Devuelve un binario <span className="text-ink-soft">({endpoint.responses.find((response) => response.status === 200)?.description})</span>.
                  Usa la consola para previsualizarlo y descargarlo, o abre la URL directamente en una pestaña.
                </p>
              </div>
            </section>
          )}

          {examples && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-semibold text-ink">Ejemplo de petición</h2>
              <CodeBlock code={examples.curl} filename="peticion.sh" maxHeight="12rem" />
              <div className="flex flex-wrap gap-2 pt-1">
                {endpoint.examples.map((example) => (
                  <span
                    key={example.label}
                    className="rounded-lg border border-line-soft bg-panel-2/50 px-2.5 py-1 text-[11px] text-ink-soft"
                    title={example.description}
                  >
                    {example.label}
                    {example.params ? (
                      <code className="ml-1.5 font-mono text-[10px] text-faint">
                        {Object.entries(example.params)
                          .slice(0, 3)
                          .map(([key, value]) => `${key}=${String(value)}`)
                          .join(' · ')}
                      </code>
                    ) : null}
                  </span>
                ))}
              </div>
            </section>
          )}

          {endpoint.source && (
            <section className="space-y-2">
              <h2 className="text-[15px] font-semibold text-ink">Fuente de los datos</h2>
              <div className="rounded-xl border border-line-soft bg-panel/50 p-3 text-[12px] text-muted">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-soft">{endpoint.source.name}</span>
                  <a href={endpoint.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-soft/90 hover:text-brand-soft">
                    sitio oficial <ExternalLink className="size-3" />
                  </a>
                </p>
                {endpoint.source.license && <p className="mt-1 text-[11.5px]">{endpoint.source.license}</p>}
                {endpoint.source.note && <p className="mt-1 text-[11.5px] text-faint">{endpoint.source.note}</p>}
              </div>
            </section>
          )}

          <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft bg-panel/40 px-4 py-3 text-[12px] text-muted">
            <BookOpen className="size-4 text-faint" />
            <span>¿Necesitas la especificación completa? Importa el OpenAPI en Postman o Insomnia.</span>
            <a
              href="/api/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-[11.5px] text-ink-soft hover:text-ink"
            >
              openapi.json <ExternalLink className="size-3" />
            </a>
            {endpoint.auth !== 'none' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-200">
                <AlertTriangle className="size-3" /> requiere X-API-Key
              </span>
            )}
          </section>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <Playground endpoint={endpoint} />
        </div>
      </div>
    </div>
  );
}
