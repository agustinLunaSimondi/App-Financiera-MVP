import React, { forwardRef } from 'react';
import { FormInput } from './FormInput';

/**
 * Input de moneda con prefix $ y validación numérica.
 * Acepta `currency` (default "ARS") y muestra el código como suffix opcional.
 */
export const CurrencyInput = forwardRef(function CurrencyInput({
    currency,
    min = 0,
    step = '0.01',
    ...rest
}, ref) {
    return (
        <FormInput
            ref={ref}
            type="number"
            inputMode="decimal"
            min={min}
            step={step}
            prefix="$"
            suffix={currency}
            {...rest}
        />
    );
});
