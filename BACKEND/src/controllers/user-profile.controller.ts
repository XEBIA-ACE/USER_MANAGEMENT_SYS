import { Request, Response } from 'express';
import { UserProfileService } from '../services/user-profile.service';
import { UpdateNameRequestDto } from '../types/user-profile.types';
import { ValidationError, UserNotFoundException } from '../errors/registration.errors';

export class UserProfileController {
  private readonly userProfileService: UserProfileService;

  constructor(userProfileService: UserProfileService) {
    this.userProfileService = userProfileService;
  }

  async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId as string;
    try {
      const profile = await this.userProfileService.getProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }

  async updateName(req: Request, res: Response): Promise<void> {
    const dto = req.body as UpdateNameRequestDto;
    const userId = req.session.userId as string;
    try {
      await this.userProfileService.updateName(userId, dto.name);
      const profile = await this.userProfileService.getProfile(userId);
      res.status(200).json(profile);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(422).json({ message: error.message });
      } else if (error instanceof UserNotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}