/**
 * Funciones de cálculo reutilizables para análisis financiero
 */

/**
 * Calcula el total de ingresos de un conjunto de transacciones
 */
/**
 * Calcula el total de ingresos de un conjunto de transacciones
 */
export const calculateTotalIncome = (transactions) => {
    return transactions
        .filter(tx => Number(tx.amount) > 0)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
};

/**
 * Calcula el total de gastos de un conjunto de transacciones
 */
export const calculateTotalExpenses = (transactions) => {
    return Math.abs(
        transactions
            .filter(tx => Number(tx.amount) < 0)
            .reduce((sum, tx) => sum + Number(tx.amount), 0)
    );
};

/**
 * Calcula el ahorro neto (ingresos - gastos)
 */
export const calculateNetSavings = (transactions) => {
    const income = calculateTotalIncome(transactions);
    const expenses = calculateTotalExpenses(transactions);
    return income - expenses;
};

/**
 * Calcula el balance total de todas las cuentas
 */
export const calculateTotalBalance = (accounts) => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
};

/**
 * Agrupa transacciones por categoría y suma los montos
 */
export const groupTransactionsByCategory = (transactions) => {
    const grouped = {};

    transactions.forEach(tx => {
        const amount = Number(tx.amount);
        if (!grouped[tx.category]) {
            grouped[tx.category] = {
                category: tx.category,
                total: 0,
                count: 0,
                transactions: []
            };
        }

        grouped[tx.category].total += Math.abs(amount);
        grouped[tx.category].count += 1;
        grouped[tx.category].transactions.push(tx);
    });

    return Object.values(grouped);
};

/**
 * Agrupa transacciones por mes
 */
export const groupTransactionsByMonth = (transactions) => {
    const grouped = {};

    transactions.forEach(tx => {
        const dateStr = tx.date || tx.transactionDate;
        const date = new Date(dateStr + 'T00:00:00'); // Handle different date fields
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(tx.amount);

        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                month: monthKey,
                income: 0,
                expenses: 0,
                transactions: []
            };
        }

        if (amount > 0) {
            grouped[monthKey].income += amount;
        } else {
            grouped[monthKey].expenses += Math.abs(amount);
        }

        grouped[monthKey].transactions.push(tx);
    });

    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
};

/**
 * Calcula el porcentaje usado del presupuesto
 */
export const calculateBudgetUsage = (spent, budget) => {
    if (budget === 0) return 0;
    return (spent / budget) * 100;
};

/**
 * Determina si un presupuesto fue excedido
 */
export const isBudgetExceeded = (spent, budget) => {
    return spent > budget;
};

/**
 * Calcula gastos por categoría para el mes actual
 */
export const calculateCurrentMonthExpensesByCategory = (transactions, categories) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTxs = transactions.filter(tx => {
        const txDate = new Date((tx.date || tx.transactionDate) + 'T00:00:00');
        return txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear &&
            Number(tx.amount) < 0;
    });

    const categoryTotals = groupTransactionsByCategory(currentMonthTxs);

    // Agregar información de color de las categorías
    return categoryTotals.map(cat => {
        const categoryInfo = categories.find(c => c.name === cat.category);
        return {
            ...cat,
            color: categoryInfo?.color || '#94a3b8'
        };
    });
};

/**
 * Genera datos para gráfico de ingresos vs gastos (últimos N meses)
 */
export const generateIncomeVsExpensesChartData = (transactions, months = 6) => {
    const monthlyData = groupTransactionsByMonth(transactions);

    // Tomar solo los últimos N meses
    const recentMonths = monthlyData.slice(-months);

    // Formatear para el gráfico
    return recentMonths.map(month => {
        const [, monthNum] = month.month.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return {
            month: monthNames[parseInt(monthNum) - 1],
            income: month.income,
            expenses: month.expenses
        };
    });
};

/**
 * Calcula el cambio porcentual entre dos valores
 */
export const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};
