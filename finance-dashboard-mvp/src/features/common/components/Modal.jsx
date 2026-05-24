import React, { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    const modalRef = useRef(null);
    const previouslyFocusedRef = useRef(null);
    const titleId = useId();

    // Bloqueo de scroll + ESC + restauración de foco
    useEffect(() => {
        if (!isOpen) return;

        // Guardar elemento que tenía foco antes de abrir
        previouslyFocusedRef.current = document.activeElement;

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
                return;
            }
            // Focus trap
            if (e.key === 'Tab' && modalRef.current) {
                const focusables = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                const active = document.activeElement;

                if (e.shiftKey) {
                    if (active === first || !modalRef.current.contains(active)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (active === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKey);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Foco inicial: primer focusable dentro del modal (skipping el close button si hay otros)
        // Esperamos un tick para que React termine de renderizar children
        const focusTimer = setTimeout(() => {
            if (!modalRef.current) return;
            const focusables = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
            // Si hay más de un focusable (close + algo más), foco al segundo
            // así no arrancan en el botón "X"
            const target = focusables.length > 1 ? focusables[1] : focusables[0];
            target?.focus({ preventScroll: true });
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = previousOverflow;
            clearTimeout(focusTimer);
            // Restaurar foco al elemento que abrió el modal
            if (previouslyFocusedRef.current && typeof previouslyFocusedRef.current.focus === 'function') {
                previouslyFocusedRef.current.focus({ preventScroll: true });
            }
        };
    }, [isOpen, onClose]);

    // Click fuera del modal para cerrar
    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    const sizeClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[size] || 'sm:max-w-md';

    // Portal a document.body — clave para que ningún Card con `motion.div`
    // (transform / overflow-hidden) cree un containing block que tape o
    // contenga el modal. Si no, el modal queda clipeado dentro de la card.
    return createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 transition-opacity"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Diálogo'}
        >
            <div
                ref={modalRef}
                className={`bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full ${sizeClass} max-h-[92dvh] flex flex-col animate-in fade-in zoom-in duration-200`}
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Drag handle en móvil */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-700/50 shrink-0">
                    {title ? (
                        <h3 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    ) : (
                        <span />
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
