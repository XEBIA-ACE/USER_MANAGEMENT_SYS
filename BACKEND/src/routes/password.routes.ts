import { Router } from 'express';
import { UserRepository } from '../repositories/user.repository';
import { PasswordRecoveryRequestRepository } from '../repositories/password-recovery-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { BcryptPasswordHasher } from '../services/bcrypt-password-hasher';
import { DefaultPasswordPolicyEvaluator } from '../services/password-policy.evaluator';
import { DefaultPasswordRecoveryService } from '../services/password-recovery.service';
import { DefaultChangePasswordService } from '../services/change-password.service';
import { PasswordController } from '../controllers/password.controller';
import { createSessionValidationMiddleware } from '../middleware/session-validation.middleware';
import { RateLimitGuard } from '../services/rate-limit.guard';
import { passwordPolicyConfig } from '../config/password-policy.config';

export function createPasswordRouter(): Router {
  const router = Router();

  const userRepository = new UserRepository();
  const sessionRepository = new SessionRepository();
  const passwordRecoveryRequestRepository = new PasswordRecoveryRequestRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const passwordPolicyEvaluator = new DefaultPasswordPolicyEvaluator(passwordPolicyConfig);

  const passwordRecoveryService = new DefaultPasswordRecoveryService(
    userRepository,
    passwordRecoveryRequestRepository,
    passwordHasher,
    passwordPolicyEvaluator,
  );

  const changePasswordService = new DefaultChangePasswordService(
    userRepository,
    passwordHasher,
    passwordPolicyEvaluator,
  );

  const passwordController = new PasswordController(
    passwordRecoveryService,
    changePasswordService,
  );

  const rateLimitGuard = new RateLimitGuard();

  router.post(
    '/request-recovery',
    rateLimitGuard.guard(),
    (req, res, next) => passwordController.requestRecovery(req, res, next),
  );

  router.post(
    '/reset',
    rateLimitGuard.guard(),
    (req, res, next) => passwordController.resetPassword(req, res, next),
  );

  router.post(
    '/change',
    rateLimitGuard.guard(),
    createSessionValidationMiddleware(sessionRepository, userRepository),
    (req, res, next) => passwordController.changePassword(req, res, next),
  );

  return router;
}