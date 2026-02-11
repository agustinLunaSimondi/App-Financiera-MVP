const BaseController = require('../../common/BaseController');
const categoryService = require('./CategoryService');

/**
 * Controlador para rutas de categorías
 */
class CategoryController extends BaseController {
    /**
     * GET /api/categories
     */
    async getAll(req, res, next) {
        try {
            const categories = await categoryService.getAll(req.user.id);
            return this.ok(res, categories);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/categories
     */
    async create(req, res, next) {
        try {
            const category = await categoryService.create(req.user.id, req.body);
            return this.created(res, category);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/categories/:id
     */
    async update(req, res, next) {
        try {
            const category = await categoryService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, category);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/categories/:id
     */
    async delete(req, res, next) {
        try {
            await categoryService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();
