/**
 * authRoutes.js
 * Registers authentication endpoints and applies input validation middleware.
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('./authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Validation rules for the login endpoint
const loginValidationRules = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

/**
 * POST /api/auth/login
 * Public endpoint — no auth middleware required.
 */
router.post('/login', loginValidationRules, authController.login);

/**
 * POST /api/auth/logout
 * Protected endpoint — requires a valid JWT.
 */
router.post('/logout', authMiddleware.verifyToken, authController.logout);

module.exports = router;
