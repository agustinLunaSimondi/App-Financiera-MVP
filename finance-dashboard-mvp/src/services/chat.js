import client from './client';

// 75s — el backend usa read=50s por turno + reintentos con backoff (2s/4s) ante 429/5xx.
// El cliente debe superar ese techo para no abortar respuestas que el backend sí completaría.
const DEFAULT_TIMEOUT_MS = 75000;

/**
 * Chat Service - Envía mensajes al Asistente Inteligente (Aki).
 * Soporta timeout vía AbortController para evitar loading infinito si Gemini cuelga.
 *
 * @param {string} message - Mensaje del usuario
 * @param {Array<{role: string, content: string}>} history - Historial de la conversación
 * @param {{ signal?: AbortSignal, timeoutMs?: number }} [opts]
 * @returns {Promise<{response: string, actionResult: object|null}>}
 */
export const sendMessageToAgent = async (message, history = [], opts = {}) => {
    const { signal: externalSignal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Si el caller pasó su propia signal, encadenarla
    if (externalSignal) {
        if (externalSignal.aborted) controller.abort();
        else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
        const response = await client.post('/chat',
            { message, history },
            { signal: controller.signal, timeout: timeoutMs }
        );
        return response.data;
    } catch (error) {
        // Normalizar el AbortError de axios/fetch a uno con name='AbortError'
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
            const abortErr = new Error('La consulta tardó demasiado. Intentá de nuevo.');
            abortErr.name = 'AbortError';
            throw abortErr;
        }
        console.error("Error in chat service:", error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};
