const express = require('express');
const categoryController = require('./CategoryController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => categoryController.getAll(req, res, next));
router.post('/', (req, res, next) => categoryController.create(req, res, next));
router.put('/:id', (req, res, next) => categoryController.update(req, res, next));
router.delete('/:id', (req, res, next) => categoryController.delete(req, res, next));

module.exports = router;
