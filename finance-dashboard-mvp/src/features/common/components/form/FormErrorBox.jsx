import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { ERROR_BOX, WARNING_BOX, SUCCESS_BOX } from '../../../../lib/formClasses';

const variants = {
    error: { cls: ERROR_BOX, Icon: AlertCircle },
    warning: { cls: WARNING_BOX, Icon: AlertTriangle },
    success: { cls: SUCCESS_BOX, Icon: CheckCircle },
};

/**
 * Caja de mensaje de error/warning/success estandarizada.
 * Reemplaza los `bg-red-50 dark:bg-red-900/20...` inline de cada form.
 */
export function FormErrorBox({ children, variant = 'error', className, icon = true }) {
    const cfg = variants[variant] || variants.error;
    const Icon = cfg.Icon;

    if (!children) return null;

    return (
        <div className={cn(cfg.cls, className)} role={variant === 'error' ? 'alert' : 'status'}>
            {icon && <Icon className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="flex-1">{children}</span>
        </div>
    );
}
