import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Popover de selección de rango personalizado.
 *
 * Usa `input type="date"` nativo (sin lib externa) en una grilla de dos campos.
 * El popover se renderiza en `document.body` vía createPortal para esquivar
 * problemas de clipping cuando el botón vive dentro de un contenedor con
 * `overflow-x-auto` o similares (caso del toggle de quickfilters).
 */
export function DateRangePicker({
    label = 'Personalizado',
    initialStart = '',
    initialEnd = '',
    active = false,
    onApply,
    onClear,
}) {
    const [open, setOpen] = useState(false);
    const [start, setStart] = useState(initialStart);
    const [end, setEnd] = useState(initialEnd);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 288 });
    const buttonRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        setStart(initialStart);
        setEnd(initialEnd);
    }, [initialStart, initialEnd]);

    // Posicionar el popover relativo al botón cada vez que se abre o cambia el
    // scroll/resize de la ventana. En mobile (<=480px) ocupa todo el ancho menos
    // 16px de margen y se ancla a la izquierda para no salirse de viewport.
    const updateCoords = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const margin = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw <= 480;
        const width = isMobile ? Math.min(vw - margin * 2, 360) : 288;

        let left;
        if (isMobile) {
            left = (vw - width) / 2;
        } else {
            left = Math.max(margin, Math.min(
                rect.right - width,
                vw - width - margin,
            ));
        }

        // Clamp top to viewport: si no entra abajo, abrir hacia arriba.
        const ESTIMATED_HEIGHT = 260;
        let top = rect.bottom + 8;
        if (top + ESTIMATED_HEIGHT > vh - margin && rect.top - ESTIMATED_HEIGHT - 8 > margin) {
            top = rect.top - ESTIMATED_HEIGHT - 8;
        }
        top = Math.max(margin, Math.min(top, vh - ESTIMATED_HEIGHT - margin));

        setCoords({ top, left, width });
    };

    useLayoutEffect(() => {
        if (!open) return;
        updateCoords();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onScrollOrResize = () => updateCoords();
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open]);

    // Click fuera (del botón Y del popover) cierra. Esc también.
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (
                buttonRef.current && !buttonRef.current.contains(e.target) &&
                popoverRef.current && !popoverRef.current.contains(e.target)
            ) {
                setOpen(false);
            }
        };
        const escHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [open]);

    const canApply = !!start && !!end && start <= end;

    const apply = () => {
        if (!canApply) return;
        onApply?.({ startDate: start, endDate: end });
        setOpen(false);
    };

    const displayLabel = (active && initialStart && initialEnd)
        ? `${formatShort(initialStart)} – ${formatShort(initialEnd)}`
        : label;

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0',
                    active
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                )}
                aria-expanded={open}
            >
                <Calendar className="w-3.5 h-3.5" />
                {displayLabel}
            </button>

            {open && createPortal(
                <div
                    ref={popoverRef}
                    style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
                    className="z-[100] p-4 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-700"
                >
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                                Desde
                            </label>
                            <input
                                type="date"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                max={end || undefined}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                min={start || undefined}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/30 outline-none"
                            />
                        </div>
                        {!canApply && start && end && (
                            <p className="text-[11px] text-rose-500 font-bold">
                                La fecha "Desde" debe ser anterior o igual a "Hasta".
                            </p>
                        )}
                        <div className="flex gap-2 pt-2">
                            {onClear && (
                                <button
                                    type="button"
                                    onClick={() => { onClear(); setStart(''); setEnd(''); setOpen(false); }}
                                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Limpiar
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={apply}
                                disabled={!canApply}
                                className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold"
                            >
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function formatShort(iso) {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
}
