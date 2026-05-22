import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { BTN_DANGER, BTN_SECONDARY } from '../../../lib/formClasses';
import { cn } from '../../../lib/utils';

/**
 * Modal estándar de confirmación de eliminación.
 * Reemplaza los banners flotantes inline en CardsPage, SavingsPage, BudgetPage,
 * RecurringPage, SettingsPage.
 *
 * Hereda focus trap + ESC + restauración de foco del Modal base.
 */
export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title = '¿Eliminar este elemento?',
    description = 'Esta acción no se puede deshacer.',
    itemName,
    confirmLabel = 'Eliminar',
    cancelLabel = 'Cancelar',
    loading = false,
}) {
    const handleConfirm = async () => {
        if (loading) return;
        await onConfirm?.();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={null} size="sm">
            <div className="-mt-2 space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
                </div>

                <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                        {title}
                    </h3>
                    {itemName && (
                        <p className="inline-block px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-bold text-zinc-700 dark:text-zinc-300 max-w-full truncate">
                            {itemName}
                        </p>
                    )}
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                        {description}
                    </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={cn(BTN_SECONDARY, "flex-1")}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        aria-disabled={loading}
                        className={cn(BTN_DANGER, "flex-1")}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
