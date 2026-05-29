import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Prompt de actualización del Service Worker.
 *
 * Con `registerType: 'prompt'` en vite.config, el SW nuevo queda "waiting" hasta
 * que el usuario acepta. Mostramos un toast persistente con botón "Recargar" que
 * activa el SW nuevo (`updateServiceWorker(true)` hace skipWaiting + reload).
 *
 * Motivo: iOS standalone (PWA en inicio) no chequea actualizaciones de forma
 * confiable → puede quedar pegado a un bundle viejo por días. Acá forzamos un
 * `registration.update()` periódico y avisamos en cuanto hay versión nueva.
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
        toast('Hay una versión nueva de Vuelto', {
            description: 'Recargá para aplicar las últimas mejoras.',
            duration: Infinity,
            action: {
                label: 'Recargar',
                onClick: () => updateServiceWorker(true),
            },
        });
    }, [needRefresh, updateServiceWorker]);

    return null;
}
