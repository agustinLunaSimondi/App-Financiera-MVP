import { useState, useEffect } from 'react';

/**
 * Hook personalizado para sincronizar estado con localStorage
 * @param {string} key - Clave de localStorage
 * @param {any} initialValue - Valor inicial si no existe en localStorage
 * @returns {[any, Function]} - [valor, setValue]
 */
export function useLocalStorage(key, initialValue) {
    // Estado para almacenar el valor
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Retornar una versión envuelta de useState's setter que
    // persiste el nuevo valor en localStorage
    const setValue = (value) => {
        try {
            // Permitir que value sea una función para tener la misma API que useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error saving localStorage key "${key}":`, error);
        }
    };

    return [storedValue, setValue];
}
