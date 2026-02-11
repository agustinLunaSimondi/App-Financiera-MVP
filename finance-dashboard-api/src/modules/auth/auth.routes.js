const express = require('express');
const authController = require('./AuthController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Rutas públicas
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Rutas protegidas
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));
router.put('/me', authenticate, (req, res, next) => authController.updateProfile(req, res, next));
router.delete('/me', authenticate, (req, res, next) => authController.deleteAccount(req, res, next));

module.exports = router;
