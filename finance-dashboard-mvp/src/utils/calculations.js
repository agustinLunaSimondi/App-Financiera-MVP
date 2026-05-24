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

// ─── Series temporales configurables ───────────────────────────────────
// granularity ∈ {'day', 'week', 'month', 'year'}
// Devuelve un array ordenado de buckets { label, income, expenses } donde
// `label` ya viene formateado en español. Si no se pasan start/end, infiere
// el rango automáticamente a partir de las transacciones.

const _MONTHS_AR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function _isoDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function _parseDay(s) {
    // Soporta 'yyyy-mm-dd' o ISO con tiempo
    const [y, m, d] = s.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
}

// Lunes como inicio de semana (ISO). Retorna nuevo Date en local timezone.
function _startOfWeek(d) {
    const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = out.getDay(); // 0=domingo, 1=lunes…
    const diff = (dow + 6) % 7; // lunes=0
    out.setDate(out.getDate() - diff);
    return out;
}

function _bucketKey(date, granularity) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if (granularity === 'day') return _isoDate(date);
    if (granularity === 'week') return _isoDate(_startOfWeek(date));
    if (granularity === 'month') return `${y}-${String(m).padStart(2, '0')}`;
    if (granularity === 'year') return String(y);
    return _isoDate(date);
}

function _labelFor(key, granularity) {
    if (granularity === 'day') {
        const [y, m, d] = key.split('-').map(Number);
        return `${d}/${String(m).padStart(2, '0')}`;
    }
    if (granularity === 'week') {
        const [y, m, d] = key.split('-').map(Number);
        return `Sem ${d}/${String(m).padStart(2, '0')}`;
    }
    if (granularity === 'month') {
        const [, mm] = key.split('-').map(Number);
        return _MONTHS_AR[mm - 1];
    }
    if (granularity === 'year') {
        return key;
    }
    return key;
}

// Recomienda una granularidad razonable según la cantidad de días del rango.
export function recommendedGranularity(rangeDays) {
    if (!rangeDays || rangeDays <= 0) return 'month';
    if (rangeDays <= 35) return 'day';
    if (rangeDays <= 120) return 'week';
    if (rangeDays <= 730) return 'month';
    return 'year';
}

// Itera buckets contiguos en el rango — clave para no saltearse buckets vacíos.
function _iterateBuckets(start, end, granularity, cb) {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    if (granularity === 'week') {
        const w = _startOfWeek(cur);
        cur.setTime(w.getTime());
    } else if (granularity === 'month') {
        cur.setDate(1);
    } else if (granularity === 'year') {
        cur.setMonth(0, 1);
    }
    while (cur <= end) {
        cb(_bucketKey(cur, granularity));
        if (granularity === 'day') cur.setDate(cur.getDate() + 1);
        else if (granularity === 'week') cur.setDate(cur.getDate() + 7);
        else if (granularity === 'month') cur.setMonth(cur.getMonth() + 1);
        else if (granularity === 'year') cur.setFullYear(cur.getFullYear() + 1);
        else break;
    }
}

export function generateTimeSeriesChartData(transactions, granularity = 'month', startDate = null, endDate = null) {
    if (!transactions || transactions.length === 0) {
        return [];
    }
    // Inferir rango si no vino dado
    const dates = transactions
        .map(tx => _parseDay(tx.date || tx.transactionDate))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a - b);
    if (dates.length === 0) return [];
    const start = startDate ? _parseDay(startDate) : dates[0];
    const end = endDate ? _parseDay(endDate) : dates[dates.length - 1];

    // Inicializar buckets vacíos en orden — así el chart muestra los huecos.
    const buckets = {};
    _iterateBuckets(start, end, granularity, (key) => {
        buckets[key] = { key, label: _labelFor(key, granularity), income: 0, expenses: 0 };
    });

    transactions.forEach(tx => {
        const d = _parseDay(tx.date || tx.transactionDate);
        if (isNaN(d.getTime())) return;
        if (d < start || d > end) return;
        const key = _bucketKey(d, granularity);
        if (!buckets[key]) {
            buckets[key] = { key, label: _labelFor(key, granularity), income: 0, expenses: 0 };
        }
        const amount = Number(tx.amount);
        if (amount > 0) buckets[key].income += amount;
        else buckets[key].expenses += Math.abs(amount);
    });

    return Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Calcula el cambio porcentual entre dos valores
 */
export const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};

/**
 * Proyecta el gasto total al fin de mes a partir del ritmo actual.
 *
 * spentToDate * (diasDelMes / diaActual). Devuelve { projection, spentToDate,
 * daysElapsed, daysInMonth, daysRemaining } o null si todavía no hay datos.
 *
 * Permite inyectar `now` y `transactions` para tests deterministas.
 */
export const projectMonthEndSpend = (transactions = [], now = new Date()) => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthTxs = transactions.filter(tx => {
        const dateStr = tx.date || tx.transactionDate;
        if (!dateStr) return false;
        const d = new Date(dateStr + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month && Number(tx.amount) < 0;
    });

    const spentToDate = monthTxs.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);

    if (day <= 0 || spentToDate === 0) {
        return {
            projection: spentToDate,
            spentToDate,
            daysElapsed: day,
            daysInMonth,
            daysRemaining: daysInMonth - day,
        };
    }

    const projection = spentToDate * (daysInMonth / day);

    return {
        projection,
        spentToDate,
        daysElapsed: day,
        daysInMonth,
        daysRemaining: daysInMonth - day,
    };
};

/**
 * Suma los budgets que aplican al mes actual (period MONTHLY).
 */
export const calculateMonthlyBudgetTotal = (budgets = []) => {
    return budgets
        .filter(b => !b.period || String(b.period).toUpperCase() === 'MONTHLY')
        .reduce((sum, b) => sum + Number(b.amount || 0), 0);
};

/**
 * Promedio histórico de gasto mensual, excluyendo el mes actual.
 * Necesita al menos un mes histórico completo; si no, devuelve null.
 */
export const calculateHistoricalMonthlyExpenseAverage = (transactions = [], now = new Date()) => {
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthly = groupTransactionsByMonth(transactions).filter(m => m.month !== currentKey);
    if (monthly.length === 0) return null;
    const total = monthly.reduce((sum, m) => sum + m.expenses, 0);
    return total / monthly.length;
};
