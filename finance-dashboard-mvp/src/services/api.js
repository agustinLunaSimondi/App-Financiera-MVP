import client from './client';

/**
 * API Service Layer - Conectado al Backend Real
 */

// ============= TRANSACTIONS =============

const PAGE_LIMIT = 200;

export const getTransactions = async (filters = {}) => {
    const params = { limit: PAGE_LIMIT, page: 1 };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.category) params.categoryId = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortDir) params.sortDir = filters.sortDir;

    const response = await client.get('/transactions', { params });
    return response.data.transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
        category: tx.category?.name || tx.category || 'Sin categoría',
        account: tx.account?.name || tx.account || 'Desconocida',
        categoryId: tx.categoryId,
        accountId: tx.accountId
    }));
};

export const getTransactionsPage = async (filters = {}, page = 1, limit = 50) => {
    const params = { limit, page };
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.category) params.categoryId = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortDir) params.sortDir = filters.sortDir;

    const response = await client.get('/transactions', { params });
    return {
        transactions: response.data.transactions.map(tx => ({
            ...tx,
            amount: Number(tx.amount),
            category: tx.category?.name || tx.category || 'Sin categoría',
            account: tx.account?.name || tx.account || 'Desconocida',
            categoryId: tx.categoryId,
            accountId: tx.accountId,
        })),
        pagination: response.data.pagination,
    };
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

// Auto-categorización por embeddings (#55)
export const getAutoCategorizeSuggestions = async (transactionIds = null) => {
    const body = transactionIds ? { transactionIds } : {};
    const res = await client.post('/transactions/auto-categorize', body);
    return res.data.suggestions || [];
};

export const acceptCategorizations = async (items) => {
    const res = await client.post('/transactions/accept-categorizations', { items });
    return res.data.updated || 0;
};

// ============= BUDGETS =============

const normalizeBudget = (b) => ({
    ...b,
    amount: Number(b.amount),
    category: typeof b.category === 'object' ? (b.category?.name || 'Sin categoría') : (b.category || 'Sin categoría'),
    categoryId: b.categoryId ?? b.category?.id ?? null,
    color: b.color || null,
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

export const recalculateBalances = async () => {
    const response = await client.post('/accounts/recalculate-balances');
    return response.data;
};

// ============= CATEGORIES =============

const normalizeCategory = (cat) => ({
    ...cat,
    type: (cat?.type || cat?.categoryType || '').toString().toUpperCase()
});

export const getCategories = async () => {
    const response = await client.get('/categories');
    return response.data.map(normalizeCategory);
};

export const addCategory = async (category) => {
    const payload = {
        name: (category.name || '').trim(),
        type: (category.type || 'EXPENSE').toString().toUpperCase(),
        color: category.color || '#6B7280',
        taxDeductible: !!category.taxDeductible,
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

// Cache simple in-memory para /auth/me — evita re-fetch en cada navegación.
const ME_CACHE_TTL = 60 * 1000; // 60s
let _meCache = { data: null, ts: 0 };

export const getSettings = async () => {
    const now = Date.now();
    if (_meCache.data && now - _meCache.ts < ME_CACHE_TTL) {
        const u = _meCache.data;
        return { currency: u.currency || 'USD', darkMode: u.darkMode };
    }
    const response = await client.get('/auth/me', { __skipAuthRedirect: true });
    _meCache = { data: response.data, ts: now };
    return { currency: response.data.currency || 'USD', darkMode: response.data.darkMode };
};

export const updateSettings = async (updates) => {
    const response = await client.put('/auth/me', updates);
    _meCache = { data: response.data, ts: Date.now() };
    return { currency: response.data.currency, darkMode: response.data.darkMode };
};

export const invalidateMeCache = () => { _meCache = { data: null, ts: 0 }; };

export const deleteUserAccount = async () => {
    await client.delete('/auth/me');
    invalidateMeCache();
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

// Reglas de auto-depósito (#56)
const normalizeRule = (r) => ({
    ...r,
    percentage: r.percentage == null ? null : Number(r.percentage),
    fixedAmount: r.fixedAmount == null ? null : Number(r.fixedAmount),
});

export const getGoalRules = async (goalId) => {
    const res = await client.get(`/savings-goals/${goalId}/rules`);
    return res.data.map(normalizeRule);
};

export const createGoalRule = async (goalId, rule) => {
    const res = await client.post(`/savings-goals/${goalId}/rules`, rule);
    return normalizeRule(res.data);
};

export const updateGoalRule = async (goalId, ruleId, updates) => {
    const res = await client.put(`/savings-goals/${goalId}/rules/${ruleId}`, updates);
    return normalizeRule(res.data);
};

export const deleteGoalRule = async (goalId, ruleId) => {
    await client.delete(`/savings-goals/${goalId}/rules/${ruleId}`);
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

export const getRecurringSuggestions = async () => {
    const response = await client.get('/recurring/suggestions');
    return response.data.suggestions.map(s => ({
        ...s,
        averageAmount: Number(s.averageAmount),
        medianIntervalDays: Number(s.medianIntervalDays),
    }));
};

export const createRecurringFromSuggestions = async (items) => {
    const response = await client.post('/recurring/from-suggestion', { items });
    return {
        created: (response.data.created || []).map(normalizeRecurring),
        skipped: response.data.skipped || 0,
    };
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

// ============= BELVO (bancos y billeteras) =============

export const getBelvoWidgetToken = async () => {
    const response = await client.get('/belvo/widget-token');
    return response.data.access;
};

export const createBelvoLink = async (linkId, institutionName) => {
    const response = await client.post('/belvo/link', {
        linkId,
        institutionName,
    });
    return response.data;
};

export const getBelvoConnections = async () => {
    const response = await client.get('/belvo/connections');
    return response.data;
};

export const syncBelvoConnection = async (connectionId) => {
    const response = await client.post(`/belvo/connections/${connectionId}/sync`);
    return response.data;
};

export const disconnectBelvoConnection = async (connectionId) => {
    await client.delete(`/belvo/connections/${connectionId}`);
    return true;
};

// ============= ANALYTICS (server-side aggregations) =============

export const getAnalyticsKpis = async ({ startDate, endDate } = {}) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await client.get('/analytics/kpis', { params });
    return res.data;
};

export const getAnalyticsBreakdown = async ({ startDate, endDate } = {}) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await client.get('/analytics/breakdown', { params });
    return res.data;
};

export const getAnalyticsCashflow = async (months = 6) => {
    const res = await client.get('/analytics/cashflow', { params: { months } });
    return res.data;
};

// ============= INFLATION / MACRO CONTEXT =============

export const getInflationContext = async () => {
    const res = await client.get('/analytics/inflation-context');
    return res.data;
};

// ============= AUTH =============

export const refreshAuthToken = async () => {
    const res = await client.post('/auth/refresh');
    return res.data;
};

// ============= STREAKS (#62) =============

export const getMyStreak = async () => {
    const res = await client.get('/streaks/me');
    return res.data;
};

// ============= BENCHMARK (#59) =============

export const getBenchmarkPrefs = async () => {
    const res = await client.get('/benchmark/prefs');
    return res.data;
};

export const updateBenchmarkPrefs = async (prefs) => {
    const res = await client.put('/benchmark/prefs', prefs);
    return res.data;
};

export const getMyBenchmark = async () => {
    const res = await client.get('/benchmark/me');
    return res.data;
};

// ============= ENVELOPES (#60) =============

export const getBudgetMode = async () => {
    const res = await client.get('/budgets/mode');
    return res.data.mode;
};

export const updateBudgetMode = async (mode) => {
    const res = await client.put('/budgets/mode', { mode });
    return res.data.mode;
};

export const getEnvelopes = async () => {
    const res = await client.get('/budgets/envelopes');
    return res.data;
};

// ============= TAX REPORT (#63) =============

export const getDeductibleCategories = async () => {
    const res = await client.get('/reports/deductible-categories');
    return res.data;
};

export const generateTaxReport = async ({ startDate, endDate, categoryIds, format }) => {
    const res = await client.post(
        '/reports/tax-deductible',
        { startDate, endDate, categoryIds, format },
        { responseType: 'blob' }
    );
    return res;
};

// ============= WIDGETS (#64) =============

export const listWidgets = async () => {
    const res = await client.get('/widgets');
    return res.data;
};

export const createWidget = async ({ type, config, expiresInDays }) => {
    const res = await client.post('/widgets', { type, config, expiresInDays });
    return res.data;
};

export const deleteWidget = async (id) => {
    await client.delete(`/widgets/${id}`);
    return true;
};

export const rotateWidgetToken = async (id) => {
    const res = await client.post(`/widgets/${id}/rotate`);
    return res.data;
};

export const getPublicWidget = async (token) => {
    const res = await client.get(`/widgets/public/${token}`, { __skipAuthRedirect: true });
    return res.data;
};
