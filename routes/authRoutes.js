/**
 * authRoutes.js
 *
 * Express router for authentication endpoints.
 */

'use strict';

const express = require('express');
const { register } = require('../controllers/authController');

const router = express.Router();

// POST /auth/register
router.post('/register', register);

module.exports = router;
