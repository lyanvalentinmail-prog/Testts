import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <EmptyState
        icon={<Compass className="size-5" />}
        title="Esta página no existe"
        description="El enlace puede estar mal escrito o el endpoint cambió de identificador. Vuelve al catálogo o usa la búsqueda global (⌘K)."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-panel-2 px-3 py-1.5 text-[12px] text-ink-soft hover:text-ink"
            >
              <ArrowLeft className="size-3.5" /> Inicio
            </Link>
            <Link
              to="/endpoints"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:text-ink"
            >
              Catálogo completo
            </Link>
          </div>
        }
      />
    </div>
  );
}
