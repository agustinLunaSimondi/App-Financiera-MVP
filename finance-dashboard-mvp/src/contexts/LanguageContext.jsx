import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from '../locales/en';
import { es } from '../locales/es';

const LanguageContext = createContext();

export const dictionaries = { en, es };

export const LanguageProvider = ({ children }) => {
    // Idioma forzado a 'es' hasta rediseñar i18n con routing por locale (/es, /en).
    // El selector de idioma fue removido del UI para lanzar a producción solo en español.
    // setLanguage queda como no-op para no romper consumidores existentes.
    const language = 'es';
    const setLanguage = () => {};

    const t = useCallback((key) => {
        const dict = dictionaries[language] || dictionaries.es;
        return dict[key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
