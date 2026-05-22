/**
 * Parser centralizado de errores de API.
 *
 * Backend Python (FastAPI) puede devolver `detail` como:
 * - string: "El monto debe ser mayor a 0"
 * - array de objetos: [{ msg, type, loc }] (errores de validación pydantic)
 * - objeto: { msg, ... }
 * - undefined: error de red, timeout, etc.
 */

export function parseApiError(error, fallback = 'Ocurrió un error inesperado. Intentá nuevamente.') {
    if (!error) return fallback;

    // Timeout o cancelación de fetch/axios
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        return 'La operación tardó demasiado. Reintentá en unos segundos.';
    }

    // Error de red sin response
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        return 'Sin conexión al servidor. Revisá tu internet.';
    }

    const detail = error?.response?.data?.detail;

    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
        return detail
            .map((d) => (typeof d === 'string' ? d : d?.msg || d?.message || JSON.stringify(d)))
            .filter(Boolean)
            .join(', ');
    }

    if (detail && typeof detail === 'object') {
        return detail.msg || detail.message || fallback;
    }

    if (typeof error?.message === 'string' && error.message && error.message !== 'Request failed') {
        return error.message;
    }

    return fallback;
}

/**
 * Extrae errores de validación por campo (útil para forms con react-hook-form o similares).
 * Devuelve un objeto { fieldName: errorMessage } o null si no hay errores estructurados.
 */
export function extractFieldErrors(error) {
    const detail = error?.response?.data?.detail;
    if (!Array.isArray(detail)) return null;

    const fields = {};
    detail.forEach((d) => {
        if (d?.loc && Array.isArray(d.loc) && d.loc.length > 1) {
            const fieldName = d.loc[d.loc.length - 1];
            fields[fieldName] = d.msg || 'Valor inválido';
        }
    });

    return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Determina si un error proviene de un timeout/cancelación.
 */
export function isTimeoutError(error) {
    return (
        error?.name === 'AbortError' ||
        error?.code === 'ECONNABORTED' ||
        error?.message?.toLowerCase().includes('timeout')
    );
}

/**
 * Determina si un error es de red (sin respuesta del servidor).
 */
export function isNetworkError(error) {
    return (
        error?.message === 'Network Error' ||
        error?.code === 'ERR_NETWORK' ||
        !error?.response
    );
}
