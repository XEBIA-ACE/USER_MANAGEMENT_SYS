import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { PasswordController } from './password.controller';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import { ChangePasswordService } from '../services/change-password.service';
import { IncorrectCurrentPasswordException } from '../errors/login.errors';
import { PasswordPolicyViolationException } from '../errors/login.errors';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

const mockRequestRecovery = jest.fn();
const mockResetPassword = jest.fn();
const mockChangePassword = jest.fn();

const mockPasswordRecoveryService: jest.Mocked<PasswordRecoveryService> = {
  requestRecovery: mockRequestRecovery,
  resetPassword: mockResetPassword,
};

const mockChangePasswordService: jest.Mocked<ChangePasswordService> = {
  changePassword: mockChangePassword,
};

// ---------------------------------------------------------------------------
// Session validation middleware mock
// ---------------------------------------------------------------------------

// Default: authenticated (session is valid, userId = 'user-123')
let sessionMiddlewareBehavior: 'authenticated' | 'unauthenticated' = 'authenticated';

jest.mock('../middleware/session-validation.middleware', () => ({
  createSessionValidationMiddleware: jest.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (sessionMiddlewareBehavior === 'unauthenticated') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      // Attach userId to request as the real middleware does
      (req as any).userId = 'user-123';
      next();
    };
  }),
}));

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function buildApp(authenticated = true): express.Application {
  sessionMiddlewareBehavior = authenticated ? 'authenticated' : 'unauthenticated';

  const app = express();
  app.use(express.json());

  const controller = new PasswordController(
    mockPasswordRecoveryService,
    mockChangePasswordService,
  );

  // Session validation middleware inline (mirrors route setup)
  const sessionGuard = (req: Request, res: Response, next: NextFunction): void => {
    if (sessionMiddlewareBehavior === 'unauthenticated') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    (req as any).userId = 'user-123';
    next();
  };

  // Existing routes
  app.post('/password/recovery', (req, res, next) =>
    controller.requestRecovery(req, res, next),
  );
  app.post('/password/reset', (req, res, next) =>
    controller.resetPassword(req, res, next),
  );

  // New route — session guard applied first
  app.post('/password/change', sessionGuard, (req, res, next) =>
    controller.changePassword(req, res, next),
  );

  // Error-handling middleware (mirrors production error handler)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.statusCode) {
      res.status(err.statusCode).json({ message: err.message, errors: err.errors });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Tests — requestRecovery (existing, must continue to pass)
// ---------------------------------------------------------------------------

describe('PasswordController — requestRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when recovery is requested successfully', async () => {
    mockRequestRecovery.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const response = await request(app)
      .post('/password/recovery')
      .send({ email: 'user@example.com' });

    expect(response.status).toBe(200);
    expect(mockRequestRecovery).toHaveBeenCalledWith('user@example.com');
  });

  it('passes errors to next when requestRecovery throws', async () => {
    const error = Object.assign(new Error('Not found'), { statusCode: 404 });
    mockRequestRecovery.mockRejectedValueOnce(error);

    const app = buildApp();
    const response = await request(app)
      .post('/password/recovery')
      .send({ email: 'unknown@example.com' });

    expect(response.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Tests — resetPassword (existing, must continue to pass)
// ---------------------------------------------------------------------------

describe('PasswordController — resetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when password is reset successfully', async () => {
    mockResetPassword.mockResolvedValueOnce(undefined);

    const app = buildApp();
    const response = await request(app)
      .post('/password/reset')
      .send({ token: 'valid-token', newPassword: 'NewPassword1!' });

    expect(response.status).toBe(200);
    expect(mockResetPassword).toHaveBeenCalledWith('valid-token', 'NewPassword1!');
  });

  it('passes errors to next when resetPassword throws', async () => {
    const error = Object.assign(new Error('Invalid token'), { statusCode: 400 });
    mockResetPassword.mockRejectedValueOnce(error);

    const app = buildApp();
    const response = await request(app)
      .post('/password/reset')
      .send({ token: 'bad-token', newPassword: 'NewPassword1!' });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — changePassword (new)
// ---------------------------------------------------------------------------

describe('PasswordController — POST /password/change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1: Unauthenticated — no valid session → HTTP 401
  // -------------------------------------------------------------------------
  it('returns 401 when no valid session is present', async () => {
    const app = buildApp(false); // unauthenticated

    const response = await request(app)
      .post('/password/change')
      .send({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });

    expect(response.status).toBe(401);
    // Service must NOT be called when unauthenticated
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Test 2: Wrong current password → HTTP 400 with appropriate error body
  // -------------------------------------------------------------------------
  it('returns 400 with error message when current password is wrong', async () => {
    const incorrectPasswordError = new IncorrectCurrentPasswordException();
    mockChangePassword.mockRejectedValueOnce(incorrectPasswordError);

    const app = buildApp(true); // authenticated

    const response = await request(app)
      .post('/password/change')
      .send({ currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: expect.stringContaining('incorrect'),
    });
    expect(mockChangePassword).toHaveBeenCalledWith(
      'user-123',
      'WrongPass1!',
      'NewPass1!',
    );
  });

  // -------------------------------------------------------------------------
  // Test 3: Policy violation → HTTP 400 with policy error body
  // -------------------------------------------------------------------------
  it('returns 400 with policy error details when new password fails policy', async () => {
    const policyError = new PasswordPolicyViolationException([
      'Password must be at least 8 characters',
      'Password must contain an uppercase letter',
    ]);
    mockChangePassword.mockRejectedValueOnce(policyError);

    const app = buildApp(true); // authenticated

    const response = await request(app)
      .post('/password/change')
      .send({ currentPassword: 'OldPass1!', newPassword: 'weak' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: expect.any(String),
    });
    expect(mockChangePassword).toHaveBeenCalledWith(
      'user-123',
      'OldPass1!',
      'weak',
    );
  });

  // -------------------------------------------------------------------------
  // Test 4: Valid request → HTTP 200 with success message
  // -------------------------------------------------------------------------
  it('returns 200 with success message when request is valid', async () => {
    mockChangePassword.mockResolvedValueOnce(undefined);

    const app = buildApp(true); // authenticated

    const response = await request(app)
      .post('/password/change')
      .send({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Password updated successfully' });
    expect(mockChangePassword).toHaveBeenCalledWith(
      'user-123',
      'OldPass1!',
      'NewPass1!',
    );
  });
});