/**
 * Wrapper sobre PostHog.
 *
 * Centraliza todos los eventos de tracking. Si VITE_POSTHOG_KEY no está
 * configurada (dev sin clave, test), los métodos son no-ops silenciosos.
 */
import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';

let initialized = false;

export function initAnalytics() {
    if (!KEY || initialized) return;
    posthog.init(KEY, {
        api_host: HOST,
        // Captura automática de pageviews y clicks desactivada — usamos eventos manuales
        // para tener control total sobre qué se trackea.
        autocapture: false,
        capture_pageview: false,
        persistence: 'localStorage+cookie',
        // No trackear en desarrollo local
        loaded: (ph) => {
            if (import.meta.env.DEV) ph.opt_out_capturing();
        },
    });
    initialized = true;
}

export function identifyUser(userId, properties = {}) {
    if (!initialized) return;
    posthog.identify(userId, properties);
}

export function resetUser() {
    if (!initialized) return;
    posthog.reset();
}

export function capture(event, properties = {}) {
    if (!initialized) return;
    posthog.capture(event, properties);
}

// ─── Eventos tipados ──────────────────────────────────────────────────────────

export const analytics = {
    // Auth
    userSignedUp: (method = 'email') =>
        capture('user_signed_up', { method }),

    userLoggedIn: (method = 'email') =>
        capture('user_logged_in', { method }),

    userLoggedOut: () =>
        capture('user_logged_out'),

    // Onboarding
    onboardingCompleted: () =>
        capture('onboarding_completed'),

    // Transacciones
    expenseAdded: (category, amountRange) =>
        capture('expense_added', { category, amount_range: amountRange }),

    // Savings
    savingsDepositMade: (amountRange) =>
        capture('savings_deposit_made', { amount_range: amountRange }),

    // Páginas
    pageViewed: (page) =>
        capture('page_viewed', { page }),

    // MercadoPago
    mpConnectClicked: () =>
        capture('mp_connect_clicked'),

    mpConnected: () =>
        capture('mp_connected'),

    mpSynced: (transactionsImported) =>
        capture('mp_synced', { transactions_imported: transactionsImported }),
};

// Util: rangos de monto para no enviar valores exactos
export function amountRange(amount) {
    if (amount < 1000) return 'lt_1k';
    if (amount < 10000) return '1k_10k';
    if (amount < 50000) return '10k_50k';
    return 'gt_50k';
}
