```typescript
import { Router, Request, Response } from 'express';
import { UserProfileService } from '../services/user-profile.service';
import { SendGridEmailAdapter } from '../adapters/sendgrid-email.adapter';

export function createUserProfileRouter(): Router {
  const router = Router();
  const userProfileService = new UserProfileService();
  const emailAdapter = new SendGridEmailAdapter();

  router.post('/', async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      await userProfileService.createProfile(email, name);

      // Send confirmation email
      await emailAdapter.sendUserProfileConfirmationEmail(email, name);

      res.status(201).json({ message: 'User profile created successfully and confirmation email sent.' });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while creating user profile.' });
    }
  });

  return router;
}
```