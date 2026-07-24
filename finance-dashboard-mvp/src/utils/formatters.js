// Moneda activa del usuario (sincronizada por FinanceContext desde settings.currency).
// Permite que formatCurrency/formatCompactCurrency reflejen la preferencia sin
// tener que pasar `currency` en cada uno de los ~40 call sites del código.
const CURRENCY_LOCALES = { ARS: 'es-AR', USD: 'en-US', EUR: 'de-DE', MXN: 'es-MX' };

// Símbolo explícito por moneda. Intl con style:'currency' renderiza ARS, USD y
// MXN todos como "$" (indistinguibles entre sí); por eso forzamos un prefijo
// regional para que el usuario vea qué moneda está usando. EUR ya mostraba "€".
const CURRENCY_SYMBOLS = { ARS: 'AR$', USD: 'US$', EUR: '€', MXN: 'MX$' };

let activeCurrency = 'ARS';

export const setActiveCurrency = (currency) => {
    activeCurrency = CURRENCY_SYMBOLS[currency] ? currency : 'ARS';
};

export const getActiveCurrency = () => activeCurrency;

// K/M solo tiene sentido en pantallas chicas donde el espacio es escaso;
// en desktop mostramos el número completo. Sincronizado por Layout.jsx vía
// matchMedia, mismo patrón que activeCurrency (evita pasar isMobile a cada call site).
let compactModeEnabled = true;

export const setCompactMode = (enabled) => {
    compactModeEnabled = enabled;
};

/**
 * Formats a given number into a localized currency string with an explicit,
 * region-disambiguated symbol (AR$, US$, MX$, €).
 * @param {number} amount - The numeric value to format.
 * @param {string} currency - The currency code (default: active user currency).
 * @param {string} locale - The locale string (default: derived from currency).
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount, currency = activeCurrency, locale = CURRENCY_LOCALES[currency] || 'es-AR') => {
    const sym = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.ARS;
    const safe = (amount === undefined || amount === null || isNaN(amount)) ? 0 : amount;
    const num = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(safe);
    return `${sym}${num}`;
};

/**
 * Formats a large number in compact notation (e.g. 1500000 -> "AR$ 1,5M", 20000 -> "AR$ 20k").
 * Falls back to full currency for small amounts. Uses the same region-disambiguated symbol.
 * @param {number} amount
 * @param {string} currency
 * @param {string} locale
 * @returns {string}
 */
export const formatCompactCurrency = (amount, currency = activeCurrency, locale = CURRENCY_LOCALES[currency] || 'es-AR') => {
    if (!compactModeEnabled) return formatCurrency(amount, currency, locale);
    const sym = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.ARS;
    if (amount === undefined || amount === null || isNaN(amount)) return `${sym} 0`;
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) {
        const val = (abs / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 });
        return `${sign}${sym} ${val}M`;
    }
    if (abs >= 1_000) {
        const val = (abs / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 });
        return `${sign}${sym} ${val}k`;
    }
    const num = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(abs);
    return `${sign}${sym} ${num}`;
};

/**
 * Formats a regular number with thousands separators (without currency symbol).
 * @param {number} amount
 * @param {string} locale 
 * @returns {string} 
 */
export const formatNumber = (amount, locale = 'es-AR') => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0';
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
};

/**
 * Formats a number to a percentage string.
 * @param {number} value
 * @param {string} locale 
 * @returns {string}
 */
export const formatPercentage = (value, locale = 'es-AR') => {
    if (value === undefined || value === null || isNaN(value)) return '0%';
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    }).format(value / 100);
};
