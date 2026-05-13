import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import { getToken } from '../services/tokenStore';
import { useAuth } from './AuthContext';
import { analytics, amountRange } from '../services/analytics';

// Crear el contexto
export const FinanceContext = createContext();

/**
 * Provider de contexto financiero global
 * Maneja todo el estado de la aplicación: transacciones, presupuestos, cuentas, etc.
 */
export function FinanceProvider({ children }) {
    const { isAuthenticated } = useAuth();

    // Estados
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [savingsGoals, setSavingsGoals] = useState([]);
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros activos
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        category: null
    });
    // Ref para que loadData no recree su referencia en cada cambio de filtro.
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    // ============= LOAD INITIAL DATA =============

    const loadData = useCallback(async () => {
        const tok = getToken();
        if (!tok) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const results = await Promise.allSettled([
            api.getTransactions(filtersRef.current),
            api.getBudgets(),
            api.getAccounts(),
            api.getCategories(),
            api.getSettings(),
            api.getSavingsGoals(),
            api.getRecurring()
        ]);

        const setters = [setTransactions, setBudgets, setAccounts, setCategories, setSettings, setSavingsGoals, setRecurringTransactions];
        const labels = ['transactions', 'budgets', 'accounts', 'categories', 'settings', 'savings', 'recurring'];
        const failures = [];

        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                setters[i](r.value);
            } else {
                failures.push(labels[i]);
                console.error(`Error cargando ${labels[i]}:`, r.reason);
            }
        });

        if (failures.length > 0) {
            setError(`No se pudieron cargar: ${failures.join(', ')}`);
        }

        setLoading(false);
    }, []);

    // Sólo cargar datos cuando el usuario está autenticado. Si no, limpiar
    // todo el estado para que después de un login fresco no aparezcan datos
    // del usuario anterior (ni queden cachés stale tras un logout).
    // `filters` en el array dispara loadData cuando cambia, usando filtersRef.current.
    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        } else {
            setTransactions([]);
            setBudgets([]);
            setAccounts([]);
            setCategories([]);
            setSavingsGoals([]);
            setRecurringTransactions([]);
            setSettings({});
            setLoading(false);
            setError(null);
        }
    }, [isAuthenticated, loadData, filters]);

    // Dark mode: aplicado exclusivamente por Layout.jsx (useEffect en isDark).
    // FinanceContext NO toca el DOM ni localStorage para dark mode —
    // evita que una respuesta lenta del backend sobreescriba la preferencia local.

    // ============= TRANSACTIONS =============

    const addTransaction = useCallback(async (transaction) => {
        try {
            const newTx = await api.addTransaction(transaction);
            setTransactions(prev => [...prev, newTx]);
            analytics.expenseAdded(
                transaction.category || 'unknown',
                amountRange(Math.abs(Number(transaction.amount || 0)))
            );
            return newTx;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateTransaction = useCallback(async (id, updates) => {
        try {
            const updatedTx = await api.updateTransaction(id, updates);
            setTransactions(prev => prev.map(tx => tx.id === id ? updatedTx : tx));
            return updatedTx;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteTransaction = useCallback(async (id) => {
        try {
            await api.deleteTransaction(id);
            setTransactions(prev => prev.filter(tx => tx.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= BUDGETS =============

    const addBudget = useCallback(async (budget) => {
        try {
            const newBudget = await api.addBudget(budget);
            setBudgets(prev => [...prev, newBudget]);
            return newBudget;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateBudget = useCallback(async (id, updates) => {
        try {
            const updatedBudget = await api.updateBudget(id, updates);
            setBudgets(prev => prev.map(b => b.id === id ? updatedBudget : b));
            return updatedBudget;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteBudget = useCallback(async (id) => {
        try {
            await api.deleteBudget(id);
            setBudgets(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= ACCOUNTS =============

    const addAccount = useCallback(async (account) => {
        try {
            const newAccount = await api.addAccount(account);
            setAccounts(prev => [...prev, newAccount]);
            return newAccount;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const updateAccount = useCallback(async (id, updates) => {
        try {
            const updatedAccount = await api.updateAccount(id, updates);
            setAccounts(prev => prev.map(a => a.id === id ? updatedAccount : a));
            return updatedAccount;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteAccount = useCallback(async (id) => {
        try {
            await api.deleteAccount(id);
            setAccounts(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= SETTINGS =============

    const updateSettings = useCallback(async (updates) => {
        try {
            const newSettings = await api.updateSettings(updates);
            setSettings(newSettings);
            return newSettings;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    const deleteUserAccount = useCallback(async () => {
        try {
            await api.deleteUserAccount();
            return true;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    }, []);

    // ============= FILTERS =============

    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({
            startDate: null,
            endDate: null,
            category: null
        });
    }, []);

    // Valor del contexto
    const value = {
        // Estado
        transactions,
        budgets,
        accounts,
        categories,
        savingsGoals,
        recurringTransactions,
        settings,
        loading,
        error,
        filters,

        // Funciones de transacciones
        addTransaction,
        updateTransaction,
        deleteTransaction,

        // Funciones de presupuestos
        addBudget,
        updateBudget,
        deleteBudget,

        // Funciones de cuentas
        addAccount,
        updateAccount,
        deleteAccount,

        // Funciones de configuración
        updateSettings,
        deleteUserAccount,

        // Funciones de categorías
        addCategory: useCallback(async (category) => {
            try {
                const newCat = await api.addCategory(category);
                setCategories(prev => [...prev, newCat]);
                return newCat;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateCategory: useCallback(async (id, updates) => {
            try {
                const updatedCat = await api.updateCategory(id, updates);
                setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
                return updatedCat;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteCategory: useCallback(async (id) => {
            try {
                await api.deleteCategory(id);
                setCategories(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de metas de ahorro
        addSavingGoal: useCallback(async (goal) => {
            try {
                const newGoal = await api.addSavingGoal(goal);
                setSavingsGoals(prev => [...prev, newGoal]);
                return newGoal;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateSavingGoal: useCallback(async (id, updates) => {
            try {
                const updated = await api.updateSavingGoal(id, updates);
                setSavingsGoals(prev => prev.map(g => g.id === id ? updated : g));
                if (updates.currentAmount !== undefined) {
                    analytics.savingsDepositMade(amountRange(Number(updates.currentAmount || 0)));
                    const accs = await api.getAccounts();
                    setAccounts(accs);
                }
                return updated;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteSavingGoal: useCallback(async (id) => {
            try {
                await api.deleteSavingGoal(id);
                setSavingsGoals(prev => prev.filter(g => g.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de transacciones recurrentes
        addRecurring: useCallback(async (rt) => {
            try {
                const newRT = await api.addRecurring(rt);
                setRecurringTransactions(prev => [...prev, newRT]);
                return newRT;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        updateRecurring: useCallback(async (id, updates) => {
            try {
                const updated = await api.updateRecurring(id, updates);
                setRecurringTransactions(prev => prev.map(rt => rt.id === id ? updated : rt));
                return updated;
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        deleteRecurring: useCallback(async (id) => {
            try {
                await api.deleteRecurring(id);
                setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));
            } catch (err) {
                setError(err.message);
                throw err;
            }
        }, []),

        // Funciones de filtros
        updateFilters,
        clearFilters,

        // Reload data
        refreshData: loadData
    };

    return (
        <FinanceContext.Provider value={value}>
            {children}
        </FinanceContext.Provider>
    );
}
