import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

let scriptPromise = null;
function loadTurnstileScript() {
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise((resolve, reject) => {
        if (window.turnstile) return resolve(window.turnstile);
        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve(window.turnstile);
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return scriptPromise;
}

// Widget managed de Cloudflare Turnstile (anti-bot). No renderiza nada si
// VITE_TURNSTILE_SITE_KEY no está seteada — hasta que se configure, los formularios
// que lo usan quedan sin CAPTCHA (el backend también hace no-op sin su secret key).
export const TurnstileWidget = forwardRef(function TurnstileWidget({ onVerify, onExpire }, ref) {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);

    useImperativeHandle(ref, () => ({
        reset: () => {
            if (widgetIdRef.current !== null && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
        },
    }), []);

    useEffect(() => {
        if (!SITE_KEY) return;
        let cancelled = false;
        loadTurnstileScript().then((turnstile) => {
            if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
            widgetIdRef.current = turnstile.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: onVerify,
                'expired-callback': () => onExpire?.(),
                'error-callback': () => onExpire?.(),
                theme: 'auto',
                size: 'flexible',
                appearance: 'interaction-only',
            });
        });
        return () => {
            cancelled = true;
            if (widgetIdRef.current !== null && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={containerRef} className="flex justify-center" />;
});
