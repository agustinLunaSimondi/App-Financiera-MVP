const express = require('express');
const analyticsController = require('./AnalyticsController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/kpis', (req, res, next) => analyticsController.getKPIs(req, res, next));
router.get('/breakdown', (req, res, next) => analyticsController.getExpenseBreakdown(req, res, next));
router.get('/cashflow', (req, res, next) => analyticsController.getCashFlow(req, res, next));

module.exports = router;
