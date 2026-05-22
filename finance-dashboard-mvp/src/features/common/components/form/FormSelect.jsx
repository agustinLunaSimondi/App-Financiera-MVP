import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { SELECT_CLS, LABEL_CLS } from '../../../../lib/formClasses';

/**
 * Select estándar con label, hint y error.
 * Recibe `options=[{value, label, disabled?}]` o children directamente.
 * Si se pasa `emptyMessage`, se muestra cuando options está vacío (en lugar de disabled select).
 */
export const FormSelect = forwardRef(function FormSelect({
    label,
    hint,
    error,
    options,
    emptyMessage,
    placeholder,
    className,
    id: idProp,
    required,
    children,
    ...rest
}, ref) {
    const autoId = useId();
    const id = idProp || autoId;

    const isEmpty = Array.isArray(options) && options.length === 0;

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={id} className={LABEL_CLS}>
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    ref={ref}
                    id={id}
                    aria-invalid={!!error}
                    aria-describedby={hint || error ? `${id}-desc` : undefined}
                    required={required}
                    disabled={isEmpty && !!emptyMessage}
                    className={cn(
                        SELECT_CLS,
                        error && "border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50",
                        className
                    )}
                    {...rest}
                >
                    {placeholder && <option value="">{placeholder}</option>}
                    {options ? options.map((opt) => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    )) : children}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
            </div>
            {(hint || error || (isEmpty && emptyMessage)) && (
                <p id={`${id}-desc`} className={cn(
                    "text-xs font-medium",
                    error ? "text-rose-600 dark:text-rose-400"
                        : isEmpty && emptyMessage ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-500 dark:text-zinc-400"
                )}>
                    {error || (isEmpty && emptyMessage) || hint}
                </p>
            )}
        </div>
    );
});
