import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from './api';

export interface HealthState {
  status: 'loading' | 'ok' | 'degraded' | 'offline';
  endpoints?: number;
  canvases?: number;
  version?: string;
  checks?: Record<string, { ok: boolean; detail: string }>;
}

/** Estado del servidor para el indicador de la cabecera. */
export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`${API_BASE}/api/health`, { headers: { Accept: 'application/json' } });
        const body = (await response.json()) as {
          success?: boolean;
          data?: { status?: string; endpoints?: number; canvases?: number; version?: string; checks?: HealthState['checks'] };
        };
        if (!alive) return;
        const data = body.data ?? {};
        setState({
          status: data.status === 'ok' ? 'ok' : response.status === 503 ? 'degraded' : 'degraded',
          endpoints: data.endpoints,
          canvases: data.canvases,
          version: data.version,
          checks: data.checks,
        });
      } catch {
        if (alive) setState({ status: 'offline' });
      }
    }
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return state;
}

export function useDebounced<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export interface UseCopy {
  copied: string | null;
  copy: (text: string, key?: string) => Promise<void>;
}

export function useCopy(resetMs = 1600): UseCopy {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string, key = 'default') => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(key);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), resetMs);
    },
    [resetMs]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { copied, copy };
}

/** Bloquea el scroll del body mientras un modal está abierto. */
export function useLockBody(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}
