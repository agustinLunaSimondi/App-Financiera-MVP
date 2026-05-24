import { describe, it, expect } from 'vitest';
import {
    calculateTotalIncome,
    calculateTotalExpenses,
    calculateNetSavings,
    calculateTotalBalance,
    groupTransactionsByCategory,
    calculateBudgetUsage,
    isBudgetExceeded,
    calculatePercentageChange,
    projectMonthEndSpend,
    calculateMonthlyBudgetTotal,
    calculateHistoricalMonthlyExpenseAverage,
    generateTimeSeriesChartData,
    recommendedGranularity,
} from './calculations';

describe('calculations', () => {
    const sample = [
        { amount: 5000, category: 'Sueldo' },
        { amount: -1000, category: 'Comida' },
        { amount: -500, category: 'Comida' },
        { amount: 200, category: 'Freelance' },
        { amount: -300, category: 'Transporte' },
    ];

    it('suma ingresos correctamente', () => {
        expect(calculateTotalIncome(sample)).toBe(5200);
    });

    it('suma gastos en valor absoluto', () => {
        expect(calculateTotalExpenses(sample)).toBe(1800);
    });

    it('netSavings = ingresos − gastos', () => {
        expect(calculateNetSavings(sample)).toBe(3400);
    });

    it('totalBalance suma todas las cuentas', () => {
        const accounts = [{ balance: 100 }, { balance: 250.5 }, { balance: '-50.25' }];
        expect(calculateTotalBalance(accounts)).toBeCloseTo(300.25, 2);
    });

    it('groupTransactionsByCategory agrupa y suma en absoluto', () => {
        const grouped = groupTransactionsByCategory(sample);
        const food = grouped.find(g => g.category === 'Comida');
        expect(food.total).toBe(1500);
        expect(food.count).toBe(2);
    });

    it('budget usage y exceeded', () => {
        expect(calculateBudgetUsage(50, 100)).toBe(50);
        expect(calculateBudgetUsage(10, 0)).toBe(0);
        expect(isBudgetExceeded(120, 100)).toBe(true);
        expect(isBudgetExceeded(80, 100)).toBe(false);
    });

    it('percentage change', () => {
        expect(calculatePercentageChange(120, 100)).toBe(20);
        expect(calculatePercentageChange(50, 0)).toBe(0);
    });

    describe('projectMonthEndSpend (#54)', () => {
        const now = new Date(2026, 4, 15); // 15 de mayo 2026, mes con 31 días.

        it('proyecta al ritmo del gasto a la fecha', () => {
            const txs = [
                { amount: -10000, transactionDate: '2026-05-01' },
                { amount: -5000, transactionDate: '2026-05-10' },
            ];
            const out = projectMonthEndSpend(txs, now);
            expect(out.spentToDate).toBe(15000);
            // 15000 * (31 / 15) = 31000
            expect(out.projection).toBeCloseTo(31000, 0);
            expect(out.daysInMonth).toBe(31);
            expect(out.daysElapsed).toBe(15);
        });

        it('ignora ingresos y transacciones de otros meses', () => {
            const txs = [
                { amount: 50000, transactionDate: '2026-05-05' }, // ingreso
                { amount: -3000, transactionDate: '2026-04-30' }, // mes pasado
                { amount: -2000, transactionDate: '2026-05-10' }, // cuenta
            ];
            const out = projectMonthEndSpend(txs, now);
            expect(out.spentToDate).toBe(2000);
        });

        it('si no hay gastos este mes, projection = 0', () => {
            const out = projectMonthEndSpend([], now);
            expect(out.spentToDate).toBe(0);
            expect(out.projection).toBe(0);
        });
    });

    it('calculateMonthlyBudgetTotal suma solo MONTHLY', () => {
        const budgets = [
            { amount: 10000, period: 'MONTHLY' },
            { amount: 5000, period: 'WEEKLY' },
            { amount: 7000 },  // sin period default es MONTHLY
        ];
        expect(calculateMonthlyBudgetTotal(budgets)).toBe(17000);
    });

    it('historicalMonthlyExpenseAverage excluye mes actual', () => {
        const now = new Date(2026, 4, 15);
        const txs = [
            { amount: -1000, transactionDate: '2026-03-15' },
            { amount: -2000, transactionDate: '2026-04-20' },
            { amount: -99999, transactionDate: '2026-05-10' }, // mes actual: se excluye
        ];
        const avg = calculateHistoricalMonthlyExpenseAverage(txs, now);
        expect(avg).toBe(1500);
    });

    it('historicalMonthlyExpenseAverage devuelve null si no hay histórico', () => {
        const now = new Date(2026, 4, 15);
        const txs = [{ amount: -1000, transactionDate: '2026-05-10' }];
        expect(calculateHistoricalMonthlyExpenseAverage(txs, now)).toBeNull();
    });

    describe('generateTimeSeriesChartData', () => {
        const txs = [
            { amount: 5000, transactionDate: '2026-05-01' },
            { amount: -300, transactionDate: '2026-05-01' },
            { amount: -200, transactionDate: '2026-05-02' },
            { amount: -100, transactionDate: '2026-05-15' },
        ];

        it('granularidad diaria respeta el rango y emite buckets vacíos', () => {
            const out = generateTimeSeriesChartData(txs, 'day', '2026-05-01', '2026-05-03');
            // 3 buckets, uno por día, sin saltearse el 2026-05-03 aunque no tenga tx.
            expect(out.length).toBe(3);
            expect(out[0]).toMatchObject({ income: 5000, expenses: 300 });
            expect(out[1]).toMatchObject({ income: 0, expenses: 200 });
            expect(out[2]).toMatchObject({ income: 0, expenses: 0 });
        });

        it('granularidad semanal agrupa por semanas (lunes)', () => {
            const out = generateTimeSeriesChartData(txs, 'week', '2026-05-01', '2026-05-15');
            expect(out.length).toBeGreaterThan(0);
            const totalExpenses = out.reduce((s, b) => s + b.expenses, 0);
            expect(totalExpenses).toBe(600);
        });

        it('granularidad mensual junta un solo bucket cuando todo cae en un mes', () => {
            const out = generateTimeSeriesChartData(txs, 'month', '2026-05-01', '2026-05-31');
            expect(out.length).toBe(1);
            expect(out[0].income).toBe(5000);
            expect(out[0].expenses).toBe(600);
        });

        it('granularidad anual junta todo en un solo bucket si el rango es un año', () => {
            const out = generateTimeSeriesChartData(txs, 'year', '2026-01-01', '2026-12-31');
            expect(out.length).toBe(1);
            expect(out[0].label).toBe('2026');
        });

        it('devuelve array vacío si no hay transacciones', () => {
            expect(generateTimeSeriesChartData([], 'month')).toEqual([]);
        });
    });

    describe('recommendedGranularity', () => {
        it('día para rangos cortos', () => {
            expect(recommendedGranularity(7)).toBe('day');
            expect(recommendedGranularity(30)).toBe('day');
        });

        it('semana para rangos medianos', () => {
            expect(recommendedGranularity(60)).toBe('week');
            expect(recommendedGranularity(120)).toBe('week');
        });

        it('mes para rangos largos', () => {
            expect(recommendedGranularity(365)).toBe('month');
            expect(recommendedGranularity(730)).toBe('month');
        });

        it('año para rangos enormes', () => {
            expect(recommendedGranularity(1500)).toBe('year');
        });

        it('null o 0 cae a mes', () => {
            expect(recommendedGranularity(null)).toBe('month');
            expect(recommendedGranularity(0)).toBe('month');
        });
    });
});
