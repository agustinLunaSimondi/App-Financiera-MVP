import client from './client';

/**
 * API Service Layer - Conectado al Backend Real
 */

// ============= TRANSACTIONS =============

export const getTransactions = async (filters = {}) => {
    // Request high limit to ensure we get all transactions for client-side calculation
    // TODO: Future refactor -> move aggregation to backend
    const params = { limit: 10000 };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.category) params.categoryId = filters.category;

    const response = await client.get('/transactions', { params });
    // Parse amounts ensuring they are numbers and flatten relations
    return response.data.transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category || 'Sin categoría',
        account: tx.account?.name || tx.account || 'Desconocida',
        categoryId: tx.categoryId,
        accountId: tx.accountId
    }));
};

export const getTransactionById = async (id) => {
    const response = await client.get(`/transactions/${id}`);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const addTransaction = async (transaction) => {
    const payload = {
        ...transaction,
        amount: parseFloat(transaction.amount)
    };
    const response = await client.post('/transactions', payload);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const updateTransaction = async (id, updates) => {
    const response = await client.put(`/transactions/${id}`, updates);
    const tx = response.data;
    return {
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category,
        account: tx.account?.name || tx.account
    };
};

export const deleteTransaction = async (id) => {
    await client.delete(`/transactions/${id}`);
    return true;
};

// ============= BUDGETS =============

// Normaliza budget para que `category` sea siempre string (nombre) y `categoryId` siempre number.
// El backend a veces devuelve `category` como objeto completo y otras como string.
const normalizeBudget = (b) => ({
    ...b,
    amount: Number(b.amount),
    category: typeof b.category === 'object' ? (b.category?.name || 'Sin categoría') : (b.category || 'Sin categoría'),
    categoryId: b.categoryId ?? b.category?.id ?? null,
});

export const getBudgets = async () => {
    const response = await client.get('/budgets');
    return response.data.map(normalizeBudget);
};

export const addBudget = async (budget) => {
    const response = await client.post('/budgets', budget);
    return normalizeBudget(response.data);
};

export const updateBudget = async (id, updates) => {
    const response = await client.put(`/budgets/${id}`, updates);
    return normalizeBudget(response.data);
};

export const deleteBudget = async (id) => {
    await client.delete(`/budgets/${id}`);
    return true;
};

// ============= ACCOUNTS =============

export const getAccounts = async () => {
    const response = await client.get('/accounts');
    return response.data.map(acc => ({
        ...acc,
        balance: Number(acc.balance)
    }));
};

export const addAccount = async (account) => {
    const response = await client.post('/accounts', account);
    return {
        ...response.data,
        balance: Number(response.data.balance)
    };
};

export const updateAccount = async (id, updates) => {
    const response = await client.put(`/accounts/${id}`, updates);
    return {
        ...response.data,
        balance: Number(response.data.balance)
    };
};

export const deleteAccount = async (id) => {
    await client.delete(`/accounts/${id}`);
    return true;
};

// ============= CATEGORIES =============

export const getCategories = async () => {
    const response = await client.get('/categories');
    return response.data.map(normalizeCategory);
};

const normalizeCategory = (cat) => ({
    ...cat,
    type: (cat?.type || cat?.categoryType || '').toString().toUpperCase()
});

export const addCategory = async (category) => {
    const payload = {
        name: (category.name || '').trim(),
        type: (category.type || 'EXPENSE').toString().toUpperCase(),
        color: category.color || '#6B7280',
    };
    if (category.icon) payload.icon = category.icon;
    const response = await client.post('/categories', payload);
    return normalizeCategory(response.data);
};

export const updateCategory = async (id, updates) => {
    const response = await client.put(`/categories/${id}`, updates);
    return normalizeCategory(response.data);
};

export const deleteCategory = async (id) => {
    await client.delete(`/categories/${id}`);
    return true;
};

// ============= SETTINGS =============

export const getSettings = async () => {
    // __skipAuthRedirect: un 401 acá no debe causar logout global — es datos opcionales.
    const response = await client.get('/auth/me', { __skipAuthRedirect: true });
    return {
        currency: response.data.currency || 'USD',
        darkMode: response.data.darkMode
    };
};

export const updateSettings = async (updates) => {
    const response = await client.put('/auth/me', updates);
    return {
        currency: response.data.currency,
        darkMode: response.data.darkMode
    };
};

export const deleteUserAccount = async () => {
    await client.delete('/auth/me');
    return true;
};

// ============= SAVINGS GOALS =============

export const getSavingsGoals = async () => {
    const response = await client.get('/savings-goals');
    return response.data.map(goal => ({
        ...goal,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount)
    }));
};

export const addSavingGoal = async (goal) => {
    const response = await client.post('/savings-goals', goal);
    return {
        ...response.data,
        targetAmount: Number(response.data.targetAmount),
        currentAmount: Number(response.data.currentAmount)
    };
};

export const updateSavingGoal = async (id, updates) => {
    const response = await client.put(`/savings-goals/${id}`, updates);
    return {
        ...response.data,
        targetAmount: Number(response.data.targetAmount),
        currentAmount: Number(response.data.currentAmount)
    };
};

export const deleteSavingGoal = async (id) => {
    await client.delete(`/savings-goals/${id}`);
    return true;
};
// ============= RECURRING TRANSACTIONS =============

const normalizeRecurring = (rt) => ({
    ...rt,
    amount: Number(rt.amount),
    category: typeof rt.category === 'object' ? (rt.category?.name || 'Sin categoría') : (rt.category || 'Sin categoría'),
    account: typeof rt.account === 'object' ? (rt.account?.name || 'Desconocida') : (rt.account || 'Desconocida'),
    categoryId: rt.categoryId ?? rt.category?.id ?? null,
    accountId: rt.accountId ?? rt.account?.id ?? null,
});

export const getRecurring = async () => {
    const response = await client.get('/recurring');
    return response.data.map(normalizeRecurring);
};

export const addRecurring = async (rt) => {
    const response = await client.post('/recurring', rt);
    return normalizeRecurring(response.data);
};

export const updateRecurring = async (id, updates) => {
    const response = await client.put(`/recurring/${id}`, updates);
    return normalizeRecurring(response.data);
};

export const deleteRecurring = async (id) => {
    await client.delete(`/recurring/${id}`);
    return true;
};

// ============= MERCADO PAGO =============

export const getMercadoPagoBalance = async () => {
    const response = await client.get('/mercadopago/balance');
    return response.data;
};

export const getMercadoPagoAuthUrl = async () => {
    const response = await client.get('/mercadopago/auth-url');
    return response.data.authUrl;
};

export const handleMercadoPagoCallback = async (code) => {
    const response = await client.post('/mercadopago/callback', { code });
    return response.data;
};

export const getMercadoPagoStatus = async () => {
    const response = await client.get('/mercadopago/status');
    return response.data;
};

export const syncMercadoPago = async () => {
    const response = await client.post('/mercadopago/sync');
    return response.data;
};

export const completeOnboarding = async () => {
    const res = await client.post('/auth/onboarding-complete');
    return res.data;
};

export const joinWaitlist = async (email, source = 'landing') => {
    const res = await client.post('/waitlist', { email, source }, { __skipAuthRedirect: true });
    return res.data;
};

export const getWaitlistCount = async () => {
    const res = await client.get('/waitlist/count', { __skipAuthRedirect: true });
    return res.data;
};

export const disconnectMercadoPago = async () => {
    await client.delete('/mercadopago/disconnect');
    return true;
};

// ============= INFLATION / MACRO CONTEXT =============

export const getInflationContext = async () => {
    const res = await client.get('/analytics/inflation-context');
    return res.data;
};
