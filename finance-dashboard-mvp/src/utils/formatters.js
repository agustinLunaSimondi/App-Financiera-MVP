/**
 * Formats a given number into a localized currency string.
 * @param {number} amount - The numeric value to format.
 * @param {string} currency - The currency code (default: ARS).
 * @param {string} locale - The locale string (default: es-AR).
 * @returns {string} The formatted currency string.
 */
export const formatCurrency = (amount, currency = 'ARS', locale = 'es-AR') => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

/**
 * Formats a large number in compact notation (e.g. 1500000 -> "$1,5M", 20000 -> "$20k").
 * Falls back to full currency for small amounts.
 * @param {number} amount
 * @param {string} currency
 * @param {string} locale
 * @returns {string}
 */
export const formatCompactCurrency = (amount, currency = 'ARS', locale = 'es-AR') => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$ 0';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) {
        const val = (abs / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 });
        return `${sign}$ ${val}M`;
    }
    if (abs >= 1_000) {
        const val = (abs / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 });
        return `${sign}$ ${val}k`;
    }
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
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
