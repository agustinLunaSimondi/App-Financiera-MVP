import { useState, useEffect, useCallback } from 'react';

/**
 * Hook tipo useState pero persistido en localStorage.
 * - Lee el valor inicial de localStorage (o usa initialValue si no existe).
 * - Sincroniza cualquier cambio a localStorage.
 * - Soporta función como setter (igual que useState).
 * - Si JSON.parse falla, devuelve initialValue silenciosamente.
 * - Sincroniza entre tabs vía el evento `storage`.
 *
 * @param {string} key — clave en localStorage
 * @param {*} initialValue — valor por defecto
 * @returns {[value, setValue, clear]}
 */
export function useLocalStorage(key, initialValue) {
    const readValue = useCallback(() => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    }, [key, initialValue]);

    const [storedValue, setStoredValue] = useState(readValue);

    const setValue = useCallback((value) => {
        try {
            const next = value instanceof Function ? value(storedValue) : value;
            setStoredValue(next);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(next));
            }
        } catch (err) {
            console.warn(`useLocalStorage: error al guardar "${key}"`, err);
        }
    }, [key, storedValue]);

    const clear = useCallback(() => {
        try {
            setStoredValue(initialValue);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch {
            // noop
        }
    }, [key, initialValue]);

    // Sincronizar entre tabs (storage event)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = (e) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch {
                    // noop
                }
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [key]);

    return [storedValue, setValue, clear];
}
