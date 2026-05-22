import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BTN_PRIMARY } from '../../../lib/formClasses';

/**
 * Button con loading state automático.
 * Previene doble-submit: deshabilita el button cuando `loading=true`.
 * Maneja `aria-disabled` para a11y (algunos navegadores ignoran `disabled` en click events).
 *
 * Si onClick es async, el caller decide cuándo limpiar `loading`.
 */
export function LoadingButton({
    children,
    loading = false,
    disabled = false,
    icon: Icon,
    loadingLabel = null,
    variant = 'primary',
    className,
    type = 'button',
    onClick,
    ...rest
}) {
    const isBlocked = loading || disabled;

    const handleClick = (e) => {
        if (isBlocked) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick?.(e);
    };

    const baseClass = variant === 'primary' ? BTN_PRIMARY : '';

    return (
        <button
            type={type}
            onClick={handleClick}
            disabled={isBlocked}
            aria-disabled={isBlocked}
            aria-busy={loading}
            className={cn(baseClass, className)}
            {...rest}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingLabel || children}
                </>
            ) : (
                <>
                    {Icon && <Icon className="w-4 h-4" />}
                    {children}
                </>
            )}
        </button>
    );
}
