export const KPI_DATA = [
    { label: 'Balance Total', value: '$12,450.00', change: '+2.5%', type: 'positive', icon: 'Wallet' },
    { label: 'Ingresos Mensuales', value: '$4,200.00', change: 'En camino', type: 'neutral', icon: 'ArrowUpCircle' },
    { label: 'Gastos Mensuales', value: '$2,850.00', change: '-4.1%', type: 'positive', icon: 'ArrowDownCircle' },
    { label: 'Ahorro Neto', value: '$1,350.00', change: '+12%', type: 'positive', icon: 'PiggyBank' },
];

export const INCOME_VS_EXPENSES_DATA = [
    { month: 'Ene', income: 4000, expenses: 2400 },
    { month: 'Feb', income: 4200, expenses: 2600 },
    { month: 'Mar', income: 4100, expenses: 2300 },
    { month: 'Abr', income: 4400, expenses: 3100 },
    { month: 'May', income: 4300, expenses: 2700 },
    { month: 'Jun', income: 4500, expenses: 2850 },
];

export const EXPENSE_CATEGORIES_DATA = [
    { name: 'Vivienda', value: 1200, color: '#10b981' }, // Emerald-500
    { name: 'Comida', value: 600, color: '#3b82f6' },    // Blue-500
    { name: 'Transporte', value: 300, color: '#f59e0b' },// Amber-500
    { name: 'Entretenim.', value: 250, color: '#ec4899' },// Pink-500
    { name: 'Servicios', value: 200, color: '#6366f1' }, // Indigo-500
    { name: 'Otros', value: 300, color: '#94a3b8' },   // Slate-400
];

export const BUDGET_VS_ACTUAL_DATA = [
    { category: 'Vivienda', budget: 1200, actual: 1200 },
    { category: 'Comida', budget: 500, actual: 600 },
    { category: 'Transporte', budget: 350, actual: 300 },
    { category: 'Entretenim.', budget: 200, actual: 250 },
    { category: 'Servicios', budget: 250, actual: 200 },
];

// Waterfall data
export const WATERFALL_DATA = [
    { name: 'Ingresos', value: 4200, fill: '#10b981' }, // Income
    { name: 'Impuestos', value: -400, fill: '#ef4444' },
    { name: 'Vivienda', value: -1200, fill: '#ef4444' },
    { name: 'Comida', value: -600, fill: '#ef4444' },
    { name: 'Transporte', value: -300, fill: '#ef4444' },
    { name: 'Ahorro', value: 1700, fill: '#3b82f6', isTotal: true }, // Remaining
];

export const RECENT_TRANSACTIONS = [
    { id: 1, name: 'Supermercado', date: '2023-10-25', amount: -120.50, category: 'Comida' },
    { id: 2, name: 'Factura Luz', date: '2023-10-24', amount: -85.00, category: 'Servicios' },
    { id: 3, name: 'Pago Freelance', date: '2023-10-22', amount: 1200.00, category: 'Ingresos' },
    { id: 4, name: 'Gasolinera', date: '2023-10-21', amount: -45.00, category: 'Transporte' },
    { id: 5, name: 'Netflix', date: '2023-10-20', amount: -15.00, category: 'Entretenim.' },
];
