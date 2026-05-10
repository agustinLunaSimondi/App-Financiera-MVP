import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
    const modalRef = useRef(null);

    // Cerrar con tecla ESC + bloquear scroll del body mientras está abierto
    useEffect(() => {
        if (!isOpen) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    // Click fuera del modal para cerrar
    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 transition-opacity"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Diálogo'}
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col transform transition-all animate-in fade-in zoom-in duration-200"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Drag handle en móvil */}
                <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-700/50 shrink-0">
                    {title ? (
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
                    ) : (
                        <span />
                    )}
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto overscroll-contain flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
