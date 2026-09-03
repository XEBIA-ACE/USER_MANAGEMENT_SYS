```typescript
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import type { Database } from 'better-sqlite3';
import { Redis } from 'ioredis';
import { createRegistrationRouter } from './routes/registration.routes';
import { createActivationRouter } from './routes/activation.routes';
import { createAdminRouter } from './routes/admin.routes';
import { createOtpRouter } from './routes/otp.routes';
import { createAuthRouter } from './routes/auth.routes';
import { createPasswordRouter } from './routes/password.routes';
import { createDeletionRouter } from './routes/deletion.routes';
import { createUserProfileRouter } from './routes/user-profile.routes';
import { createHealthRouter } from './routes/health.routes';
import { OtpDeliveryPort } from './adapters/otp-delivery.port';
import { EmailDeliveryPort } from './adapters/email-delivery.port';
import { UserRepository } from './repositories/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { DefaultSessionService } from './services/session.service';
import {
  ValidationError,
  UsernameConflictError,
  TokenNotFoundException,
  TokenExpiredException,
  TokenConsumedException,
  AccountNotPendingException,
  DuplicateDispatchException,
  UserNotFoundException,
} from './errors/registration.errors';
import {
  InvalidCredentialsException,
  AccountNotActiveException,
  AccountLockedException,
  SessionCreationFailedException,
  SessionNotFoundException,
  SessionExpiredException,
  SessionInvalidatedException,
  PasswordPolicyViolationException,
} from './errors/login.errors';
import {
  DeletionRequestAlreadyPendingException,
  DeletionRequestNotFoundException,
} from './errors/account-deletion.errors';
import { PasswordChangeRateLimitExceededException } from './errors/password-change.errors';

function createAppErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof PasswordChangeRateLimitExceededException) {
    res.setHeader('Retry-After', err.retryAfterSeconds);
    res.status(429).json({
      errorCode: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED',
      message: 'Too many password change attempts. Please try again later.',
      retryAfterSeconds: err.retryAfterSeconds,
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(422).json({ errorCode: err.code, message: err.message });
    return;
  }

  if (err instanceof UsernameConflictError) {
    res.status(409).json({ errorCode: 'USERNAME_CONFLICT', message: err.message });
    return;
  }

  if (err instanceof TokenNotFoundException) {
    res.status(404).json({ errorCode: 'TOKEN_NOT_FOUND', message: err.message });
    return;
  }

  if (err instanceof TokenExpiredException) {
    res.status(410).json({ errorCode: 'TOKEN_EXPIRED', message: err.message });
    return;
  }

  if (err instanceof TokenConsumedException) {
    res.status(410).json({ errorCode: 'TOKEN_CONSUMED', message: err.message });
    return;
  }

  if (err instanceof AccountNotPendingException) {
    res.status(409).json({ errorCode: 'ACCOUNT_NOT_PENDING', message: err.message });
    return;
  }

  if (err instanceof DuplicateDispatchException) {
    res.status(409).json({ errorCode: 'DUPLICATE_DISPATCH', message: err.message });
    return;
  }

  if (err instanceof UserNotFoundException) {
    res.status(404).json({ errorCode: 'USER_NOT_FOUND', message: err.message });
    return;
  }

  if (err instanceof InvalidCredentialsException) {
    res.status(401).json({ errorCode: 'INVALID_CREDENTIALS', message: err.message });
    return;
  }

  if (err instanceof AccountNotActiveException) {
    res.status(403).json({ errorCode: 'ACCOUNT_NOT_ACTIVE', message: err.message });
    return;
  }

  if (err instanceof AccountLockedException) {
    res.status(423).json({ errorCode: 'ACCOUNT_LOCKED', message: err.message });
    return;
  }

  if (err instanceof SessionCreationFailedException) {
    res.status(500).json({ errorCode: 'SESSION_CREATION_FAILED', message: err.message });
    return;
  }

  if (err instanceof SessionNotFoundException) {
    res.status(401).json({ errorCode: 'SESSION_NOT_FOUND', message: err.message });
    return;
  }

  if (err instanceof SessionExpiredException) {
    res.status(401).json({ errorCode: 'SESSION_EXPIRED', message: err.message });
    return;
  }

  if (err instanceof SessionInvalidatedException) {
    res.status(401).json({ errorCode: 'SESSION_INVALIDATED', message: err.message });
    return;
  }

  if (err instanceof PasswordPolicyViolationException) {
    res.status(422).json({ errorCode: 'PASSWORD_POLICY_VIOLATION', message: err.message });
    return;
  }

  if (err instanceof DeletionRequestAlreadyPendingException) {
    res.status(409).json({ errorCode: 'DELETION_REQUEST_ALREADY_PENDING', message: err.message });
    return;
  }

  if (err instanceof DeletionRequestNotFoundException) {
    res.status(404).json({ errorCode: 'DELETION_REQUEST_NOT_FOUND', message: err.message });
    return;
  }

  // Fallback for unhandled errors
  console.error('Unhandled error:', err);
  res.status(500).json({ errorCode: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
}

export function createApp(
  db: Database,
  redis: Redis,
  otpDeliveryPort: OtpDeliveryPort,
  emailDeliveryPort: EmailDeliveryPort,
): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const userRepository = new UserRepository(db);
  const sessionRepository = new SessionRepository(db);
  const sessionService = new DefaultSessionService(sessionRepository);

  const swaggerDocument = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use('/api/v1', createHealthRouter());
  app.use('/api/v1', createRegistrationRouter(db, otpDeliveryPort));
  app.use('/api/v1', createActivationRouter(db));
  app.use('/api/v1', createAdminRouter(db));
  app.use('/api/v1', createOtpRouter(db, redis, otpDeliveryPort));
  app.use('/api/v1', createAuthRouter(db, redis));
  app.use('/api/v1', createPasswordRouter(db, redis));
  app.use('/api/v1', createDeletionRouter(db, emailDeliveryPort));
  app.use('/api/v1', createUserProfileRouter(db, sessionService));

  app.use(createAppErrorHandler);

  return app;
}
```