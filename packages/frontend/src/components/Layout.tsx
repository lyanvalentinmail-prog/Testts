import { BookOpen, Github, Menu, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useHealth } from '../lib/hooks';
import { cn } from '../lib/ui';
import { Sidebar } from './Sidebar';
import { SearchPalette } from './SearchPalette';

const REPO_URL = 'https://github.com/lyanvalentinmail-prog/Testts';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const health = useHealth();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === '/' && !searchOpen) {
        const target = event.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const statusDot =
    health.status === 'ok' ? 'bg-emerald-400' : health.status === 'loading' ? 'bg-zinc-500' : 'bg-amber-400';

  return (
    <div className="min-h-screen bg-void">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} health={health} />

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 border-b border-line-soft/80 bg-void/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-line-soft bg-panel/60 text-ink-soft hover:bg-panel-2 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-line-soft bg-panel/70 px-3 text-left text-[13px] text-faint transition-colors hover:border-line hover:bg-panel-2 sm:max-w-md"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Buscar un endpoint…</span>
              <kbd className="ml-auto hidden shrink-0 rounded border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">
                ⌘K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <span
                className="hidden items-center gap-2 rounded-lg border border-line-soft bg-panel/60 px-2.5 py-1.5 text-[11.5px] text-ink-soft sm:flex"
                title={
                  health.checks
                    ? Object.entries(health.checks)
                        .map(([key, value]) => `${key}: ${value.ok ? 'ok' : 'fallo'} (${value.detail})`)
                        .join('\n')
                    : undefined
                }
              >
                <span className={cn('size-1.5 rounded-full', statusDot)} />
                {health.status === 'ok' ? 'API conectada' : health.status === 'loading' ? 'Conectando…' : health.status === 'offline' ? 'Sin conexión' : 'Degradada'}
              </span>

              <Link
                to="/docs"
                className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-ink"
                aria-label="Guía de uso"
                title="Guía de uso"
              >
                <BookOpen className="size-4" />
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-ink"
                aria-label="Repositorio en GitHub"
                title="Repositorio en GitHub"
              >
                <Github className="size-4" />
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <Outlet context={{ health }} />
        </main>

        <footer className="border-t border-line-soft">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-6 text-[12px] text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>
              Velora API · plataforma de catálogo, documentación y pruebas · plantillas de{' '}
              <span className="text-muted">CategoriaCanvas</span> (Google Drive)
            </p>
            <div className="flex items-center gap-4">
              <Link to="/docs" className="hover:text-ink-soft">
                Guía
              </Link>
              <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="hover:text-ink-soft">
                OpenAPI 3.1
              </a>
              <a href="/api/health" target="_blank" rel="noreferrer" className="hover:text-ink-soft">
                Health
              </a>
            </div>
          </div>
        </footer>
      </div>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
