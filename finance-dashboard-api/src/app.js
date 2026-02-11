const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
// Importar rutas (Refactored)
const authRoutes = require('./modules/auth/auth.routes');
const transactionRoutes = require('./modules/transactions/transaction.routes');
const accountRoutes = require('./modules/accounts/account.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const budgetRoutes = require('./modules/budgets/budget.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const savingsGoalsRoutes = require('./modules/savings/savings.routes');
const recurringTransactionsRoutes = require('./modules/recurring/recurring.routes');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Habilitar CORS para el frontend
app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175'
        ];

        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Parsear JSON
app.use(express.json());

// ============================================
// RUTAS
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/savings-goals', savingsGoalsRoutes);
app.use('/api/recurring', recurringTransactionsRoutes);

// Manejo de errores
app.use(errorHandler);

// Ruta 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// La inicialización del servidor se movió a server.js para facilitar testing

module.exports = app;
