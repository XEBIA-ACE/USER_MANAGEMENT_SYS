/**
 * authController.test.js
 * Integration-style tests for the authentication HTTP endpoints.
 *
 * Uses supertest to fire real HTTP requests against an Express app instance.
 * Mocks authService so controller tests remain isolated from DB/bcrypt.
 */

const request = require('supertest');
const express = require('express');
const { body } = require('express-validator');

// Set env before requiring modules
process.env.JWT_SECRET = 'test-secret-key-for-controller-tests';

// Mock authService before requiring the controller
jest.mock('../../src/auth/authService', () => {
  const { AuthenticationError } = jest.requireActual('../../src/auth/authService');
  return {
    AuthenticationError,
    authenticateUser: jest.fn(),
  };
});

const authService = require('../../src/auth/authService');
const authController = require('../../src/auth/authController');

// Build a minimal Express app for testing
function buildApp() {
  const app = express();
  app.use(express.json());

  const loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
  ];

  app.post('/api/auth/login', loginValidation, authController.login);
  app.post('/api/auth/logout', authController.logout);
  return app;
}

const app = buildApp();

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  afterEach(() => jest.clearAllMocks());

  test('200 + token on valid credentials', async () => {
    authService.authenticateUser.mockResolvedValue({
      token: 'mock.jwt.token',
      user: { id: 'user-001', email: 'alice@example.com', role: 'user' },
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'SecurePass123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('mock.jwt.token');
    expect(res.body.user.email).toBe('alice@example.com');
  });

  test('401 on invalid credentials', async () => {
    const { AuthenticationError } = jest.requireActual('../../src/auth/authService');
    authService.authenticateUser.mockRejectedValue(
      new AuthenticationError('Invalid email or password')
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'WrongPass123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('400 on missing / invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'SecurePass123!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 on short password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('500 on unexpected service error', async () => {
    authService.authenticateUser.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'SecurePass123!' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    // Must not leak internal error details
    expect(res.body.message).toBe('Internal server error');
  });
});

describe('POST /api/auth/logout', () => {
  test('200 on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
