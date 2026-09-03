import { Router } from 'express';
import { createSessionValidationMiddleware } from '../middleware/session-validation.middleware';
import { UserProfileController } from '../controllers/user-profile.controller';
import { DefaultUserProfileService } from '../services/user-profile.service';
import { UserRepository } from '../repositories/user.repository';

export function createUserProfileRouter(): Router {
  const router = Router();

  const userRepository = new UserRepository();
  const userProfileService = new DefaultUserProfileService(userRepository);
  const controller = new UserProfileController(userProfileService);

  const sessionValidationMiddleware = createSessionValidationMiddleware();

  router.get(
    '/me',
    sessionValidationMiddleware,
    (req, res) => controller.getMe(req, res)
  );

  router.patch(
    '/me/name',
    sessionValidationMiddleware,
    (req, res) => controller.updateName(req, res)
  );

  return router;
}