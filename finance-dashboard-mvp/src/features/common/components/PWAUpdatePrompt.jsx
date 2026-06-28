import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Activador de actualización del Service Worker.
 *
 * Con `registerType: 'autoUpdate'` en vite.config, el SW nuevo hace skipWaiting +
 * clientsClaim solo (sin esperar consentimiento). Antes era 'prompt': el SW nuevo
 * quedaba "waiting" hasta que el usuario tocaba un toast — si nunca lo tocaba (muy
 * común en iOS standalone, que no chequea updates de forma confiable), el bundle
 * JS quedaba viejo mientras el resto del deploy (CSS, index.html) ya era nuevo,
 * rompiendo el layout (headers duplicados, títulos corridos).
 *
 * Acá solo recargamos en cuanto el hook detecta la versión nueva, y forzamos un
 * `registration.update()` periódico para que la detección no dependa de un reload manual.
 */
export function PWAUpdatePrompt() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (registration) {
                // Chequeo de update cada 30min mientras la app está abierta.
                setInterval(() => registration.update(), 30 * 60 * 1000);
            }
        },
    });

    useEffect(() => {
        if (!needRefresh) return;
        toast.loading('Actualizando Vueltito a la última versión...', { duration: 2000 });
        updateServiceWorker(true);
    }, [needRefresh, updateServiceWorker]);

    return null;
}
