import { KPI_DATA, INCOME_VS_EXPENSES_DATA, EXPENSE_CATEGORIES_DATA, BUDGET_VS_ACTUAL_DATA, WATERFALL_DATA, RECENT_TRANSACTIONS } from '../data';

/**
 * Convierte datos hardcodeados en datos iniciales para localStorage
 */

// Convertir transacciones recientes a formato completo
export const getInitialTransactions = () => {
    return RECENT_TRANSACTIONS.map(tx => ({
        ...tx,
        type: tx.amount > 0 ? 'income' : 'expense',
        accountId: 1 // Cuenta por defecto
    }));
};

// Convertir presupuestos
export const getInitialBudgets = () => {
    return BUDGET_VS_ACTUAL_DATA.map((item, idx) => ({
        id: idx + 1,
        category: item.category,
        amount: item.budget,
        period: 'monthly'
    }));
};

// Cuentas iniciales
export const getInitialAccounts = () => {
    return [
        {
            id: 1,
            name: 'Cuenta Principal',
            type: 'checking',
            balance: 12450,
            currency: 'USD'
        },
        {
            id: 2,
            name: 'Ahorros',
            type: 'savings',
            balance: 5000,
            currency: 'USD'
        }
    ];
};

// Categorías iniciales
export const getInitialCategories = () => {
    return [
        { id: 'vivienda', name: 'Vivienda', color: '#10b981', icon: 'Home', type: 'expense' },
        { id: 'comida', name: 'Comida', color: '#3b82f6', icon: 'UtensilsCrossed', type: 'expense' },
        { id: 'transporte', name: 'Transporte', color: '#f59e0b', icon: 'Car', type: 'expense' },
        { id: 'entretenimiento', name: 'Entretenim.', color: '#ec4899', icon: 'Film', type: 'expense' },
        { id: 'servicios', name: 'Servicios', color: '#6366f1', icon: 'Zap', type: 'expense' },
        { id: 'otros', name: 'Otros', color: '#94a3b8', icon: 'MoreHorizontal', type: 'expense' },
        { id: 'ingresos', name: 'Ingresos', color: '#10b981', icon: 'TrendingUp', type: 'income' },
        { id: 'impuestos', name: 'Impuestos', color: '#ef4444', icon: 'FileText', type: 'expense' },
    ];
};

// Configuración inicial
export const getInitialSettings = () => {
    return {
        currency: 'USD',
        darkMode: false,
        language: 'es',
        dateFormat: 'DD/MM/YYYY'
    };
};

// Exportar todo como seed data
export const SEED_DATA = {
    transactions: getInitialTransactions,
    budgets: getInitialBudgets,
    accounts: getInitialAccounts,
    categories: getInitialCategories,
    settings: getInitialSettings
};
