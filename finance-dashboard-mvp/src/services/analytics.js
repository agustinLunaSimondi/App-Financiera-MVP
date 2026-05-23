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

// El usuario puede aceptar/rechazar tracking vía banner o /settings.
// Default: opt-in implícito (compatible con AR / fuera de UE). Para UE poner CONSENT_REQUIRED=true.
const CONSENT_REQUIRED = (import.meta.env.VITE_ANALYTICS_CONSENT_REQUIRED || 'false') === 'true';
const CONSENT_KEY = 'analytics_consent';

function hasConsent() {
    if (!CONSENT_REQUIRED) return true;
    try {
        return localStorage.getItem(CONSENT_KEY) === 'granted';
    } catch {
        return false;
    }
}

export function setAnalyticsConsent(granted) {
    try {
        localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    } catch { /* noop */ }
    if (initialized) {
        if (granted) posthog.opt_in_capturing();
        else posthog.opt_out_capturing();
    } else if (granted) {
        initAnalytics();
    }
}

export function getAnalyticsConsent() {
    if (!CONSENT_REQUIRED) return 'granted';
    try {
        return localStorage.getItem(CONSENT_KEY) || 'pending';
    } catch {
        return 'pending';
    }
}

export function initAnalytics() {
    if (!KEY || initialized) return;
    if (!hasConsent()) return;
    posthog.init(KEY, {
        api_host: HOST,
        autocapture: false,
        capture_pageview: false,
        persistence: 'localStorage+cookie',
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

    onboardingStepCompleted: (step) =>
        capture('onboarding_step_completed', { step }),

    onboardingStepSkipped: (step) =>
        capture('onboarding_step_skipped', { step }),

    // Setup desde onboarding
    budgetAdded: (source, amountRange) =>
        capture('budget_added', { source, amount_range: amountRange }),

    savingsGoalCreated: (source, amountRange) =>
        capture('savings_goal_created', { source, amount_range: amountRange }),

    recurringCreated: (source, type, amountRange) =>
        capture('recurring_created', { source, type, amount_range: amountRange }),

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

    // Landing
    landingViewed: () =>
        capture('landing_viewed'),

    waitlistSignup: (source) =>
        capture('waitlist_signup', { source }),

    landingCtaClicked: (cta) =>
        capture('landing_cta_clicked', { cta }),

    // Quick win #54 — proyección fin de mes
    projectionViewed: ({ exceedsBudget, daysElapsed }) =>
        capture('projection_viewed', { exceeds_budget: !!exceedsBudget, days_elapsed: daysElapsed }),

    // Quick win #61 — sugerencias de suscripciones recurrentes
    subscriptionsSuggestionViewed: (count) =>
        capture('subscriptions_suggestion_viewed', { count }),

    subscriptionsSuggestionEngaged: (count) =>
        capture('subscriptions_suggestion_engaged', { count }),

    subscriptionsSuggestionConverted: (count) =>
        capture('subscriptions_suggestion_converted', { count }),
};

// Util: rangos de monto para no enviar valores exactos
export function amountRange(amount) {
    if (amount < 1000) return 'lt_1k';
    if (amount < 10000) return '1k_10k';
    if (amount < 50000) return '10k_50k';
    return 'gt_50k';
}
