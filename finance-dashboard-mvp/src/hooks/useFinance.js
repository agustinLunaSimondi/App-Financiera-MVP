import { useContext } from 'react';
import { FinanceContext } from '../contexts/FinanceContext';

/**
 * Hook personalizado para usar el FinanceContext fácilmente
 * Lanza un error si se usa fuera del FinanceProvider
 */
export function useFinance() {
    const context = useContext(FinanceContext);

    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }

    return context;
}
