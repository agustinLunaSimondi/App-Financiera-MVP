/**
 * Captura de atribución de adquisición (UTM + referrer + código de referido).
 *
 * Se guarda en sessionStorage al aterrizar y se lee recién en el registro, porque
 * entre que alguien llega y se registra suele navegar varias páginas — si leyéramos
 * la URL en el momento del signup, la atribución ya se perdió y todo el tráfico
 * pago aparecería como "directo".
 *
 * First-touch: una vez capturado no se pisa dentro de la misma sesión.
 */

const STORAGE_KEY = 'vueltito_attribution';
const REFERRAL_PARAM = 'ref';

const UTM_PARAMS = {
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
};

// Los valores se recortan en el cliente además de en el backend: no confiamos en
// ninguno de los dos lados por separado.
const MAX_VALUE_LEN = 128;

function safeTrim(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().slice(0, MAX_VALUE_LEN);
    return trimmed.length > 0 ? trimmed : null;
}

function readStored() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        // sessionStorage puede fallar en modo privado o con storage deshabilitado.
        // La atribución es "nice to have": nunca debe romper la navegación.
        return null;
    }
}

function writeStored(data) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        /* noop */
    }
}

/**
 * Lee la URL actual y guarda la atribución si todavía no había ninguna.
 * Idempotente: llamarla en cada render no pisa el primer touch.
 *
 * @returns {object|null} la atribución vigente en esta sesión
 */
export function captureAttribution() {
    if (typeof window === 'undefined') return null;

    const existing = readStored();
    if (existing) return existing;

    let params;
    try {
        params = new URLSearchParams(window.location.search);
    } catch {
        return null;
    }

    const captured = {};
    for (const [param, key] of Object.entries(UTM_PARAMS)) {
        const value = safeTrim(params.get(param));
        if (value) captured[key] = value;
    }

    const referralCode = safeTrim(params.get(REFERRAL_PARAM));
    if (referralCode) captured.referralCode = referralCode.toUpperCase();

    // document.referrer solo sirve si viene de otro dominio — si es del nuestro
    // es navegación interna y guardarlo falsearía la fuente.
    const rawReferrer = safeTrim(document.referrer);
    if (rawReferrer && !rawReferrer.includes(window.location.host)) {
        captured.referrer = rawReferrer;
    }

    captured.landingPath = window.location.pathname || '/';

    // Si no hay ninguna señal real, no ensuciamos el storage: que quede como
    // tráfico directo en vez de una entrada vacía que parece atribuida.
    const hasSignal = Object.keys(captured).some(
        (k) => k !== 'landingPath' && captured[k],
    );
    if (!hasSignal) return null;

    captured.capturedAt = new Date().toISOString();
    writeStored(captured);
    return captured;
}

/** Atribución guardada, o null. No lee la URL. */
export function getAttribution() {
    return readStored();
}

/** Código de referido capturado por `?ref=`, o null. */
export function getReferralCode() {
    return readStored()?.referralCode || null;
}

/**
 * Payload para mandar en el registro. Devuelve {} si no hay nada,
 * así el body del request no se llena de nulls.
 */
export function getAttributionPayload() {
    const stored = readStored();
    if (!stored) return {};

    const payload = {};
    for (const key of ['utmSource', 'utmMedium', 'utmCampaign', 'referrer', 'landingPath', 'referralCode']) {
        if (stored[key]) payload[key] = stored[key];
    }
    return payload;
}

/** Limpia la atribución. Se llama después de un registro exitoso. */
export function clearAttribution() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* noop */
    }
}

/** Link de invitación para compartir. */
export function buildReferralLink(code) {
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?${REFERRAL_PARAM}=${encodeURIComponent(code)}`;
}
