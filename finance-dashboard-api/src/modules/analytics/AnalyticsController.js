const BaseController = require('../../common/BaseController');
const analyticsService = require('./AnalyticsService');

/**
 * Controlador para rutas de analíticas y reportes
 */
class AnalyticsController extends BaseController {
    /**
     * GET /api/analytics/kpis
     */
    async getKPIs(req, res, next) {
        try {
            const kpis = await analyticsService.getKPIs(req.user.id, req.query);
            return this.ok(res, kpis);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/breakdown
     */
    async getExpenseBreakdown(req, res, next) {
        try {
            const breakdown = await analyticsService.getExpenseBreakdown(req.user.id, req.query);
            return this.ok(res, breakdown);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/analytics/cashflow
     */
    async getCashFlow(req, res, next) {
        try {
            const months = parseInt(req.query.months) || 6;
            const flow = await analyticsService.getCashFlow(req.user.id, months);
            return this.ok(res, flow);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AnalyticsController();
