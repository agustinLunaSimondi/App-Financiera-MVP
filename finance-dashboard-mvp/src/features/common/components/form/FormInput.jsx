import React, { forwardRef, useId } from 'react';
import { cn } from '../../../../lib/utils';
import { INPUT_CLS, LABEL_CLS } from '../../../../lib/formClasses';

/**
 * Input estándar con label, hint y error.
 * Reemplaza la combinación label+input+error que se repite en forms.
 *
 * Si se pasa un `prefix` (ej. "$"), se renderiza visualmente dentro del input.
 */
export const FormInput = forwardRef(function FormInput({
    label,
    hint,
    error,
    prefix,
    suffix,
    className,
    id: idProp,
    required,
    ...rest
}, ref) {
    const autoId = useId();
    const id = idProp || autoId;

    return (
        <div className="space-y-1">
            {label && (
                <label htmlFor={id} className={LABEL_CLS}>
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <div className="relative">
                {prefix && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 font-bold text-sm pointer-events-none">
                        {prefix}
                    </span>
                )}
                <input
                    ref={ref}
                    id={id}
                    aria-invalid={!!error}
                    aria-describedby={hint || error ? `${id}-desc` : undefined}
                    required={required}
                    className={cn(
                        INPUT_CLS,
                        prefix && "pl-8",
                        suffix && "pr-10",
                        error && "border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50",
                        className
                    )}
                    {...rest}
                />
                {suffix && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-xs font-bold uppercase pointer-events-none">
                        {suffix}
                    </span>
                )}
            </div>
            {(hint || error) && (
                <p id={`${id}-desc`} className={cn(
                    "text-xs font-medium",
                    error ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"
                )}>
                    {error || hint}
                </p>
            )}
        </div>
    );
});
