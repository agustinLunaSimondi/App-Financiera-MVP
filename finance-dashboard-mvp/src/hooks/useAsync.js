/**
 * Hook ligero para cargar datos asincrónicos.
 *
 * No es React Query, pero cubre el 80% de los casos: cache por key, dedup
 * de requests en vuelo, refetch, error/loading state.
 *
 * Diseñado como puente: si en el futuro migramos a TanStack Query, el contrato
 * de `data/loading/error/refetch` ya está armado.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const _cache = new Map();
const _inflight = new Map();

export function useAsync(key, fetcher, { enabled = true, ttlMs = 30_000 } = {}) {
    const [data, setData] = useState(() => {
        const cached = _cache.get(key);
        if (cached && Date.now() - cached.ts < ttlMs) return cached.value;
        return null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const load = useCallback(async (force = false) => {
        if (!key) return;
        const cached = _cache.get(key);
        if (!force && cached && Date.now() - cached.ts < ttlMs) {
            setData(cached.value);
            return cached.value;
        }
        if (_inflight.has(key)) {
            return _inflight.get(key);
        }
        setLoading(true);
        setError(null);
        const p = (async () => {
            try {
                const value = await fetcherRef.current();
                _cache.set(key, { value, ts: Date.now() });
                setData(value);
                return value;
            } catch (e) {
                setError(e);
                throw e;
            } finally {
                setLoading(false);
                _inflight.delete(key);
            }
        })();
        _inflight.set(key, p);
        return p;
    }, [key, ttlMs]);

    useEffect(() => {
        if (enabled) load().catch(() => { /* manejado en state */ });
    }, [enabled, load]);

    const invalidate = useCallback(() => {
        _cache.delete(key);
    }, [key]);

    return { data, loading, error, refetch: () => load(true), invalidate };
}

export function clearAsyncCache(prefix = null) {
    if (!prefix) {
        _cache.clear();
        return;
    }
    for (const k of [..._cache.keys()]) {
        if (k.startsWith(prefix)) _cache.delete(k);
    }
}
