/**
 * Inicialización opcional de Sentry frontend.
 * Si VITE_SENTRY_DSN no está seteada, los métodos son no-op.
 */
let _sentry = null;

export async function initSentry() {
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) return;
    try {
        const Sentry = await import('@sentry/react');
        Sentry.init({
            dsn,
            environment: import.meta.env.MODE,
            tracesSampleRate: 0.1,
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: 0.1,
        });
        _sentry = Sentry;
    } catch {
        // Sentry SDK no instalado o falló la carga — silencioso.
    }
}

export function captureException(err, context = {}) {
    if (_sentry) _sentry.captureException(err, { extra: context });
    else if (import.meta.env.DEV) console.error('[capture]', err, context);
}

export function setSentryUser(user) {
    if (!_sentry) return;
    _sentry.setUser(user ? { id: user.id, email: undefined } : null);
}
