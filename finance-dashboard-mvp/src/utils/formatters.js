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
