import { NextFunction, Request, Response } from 'express';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import { ChangePasswordService } from '../services/change-password.service';
import { PasswordRecoveryRequestDto, PasswordResetRequestDto } from '../types/login.types';
import { ChangePasswordRequestDto } from '../types/login.types';

export class PasswordController {
  private readonly passwordRecoveryService: PasswordRecoveryService;
  private readonly changePasswordService: ChangePasswordService;

  constructor(
    passwordRecoveryService: PasswordRecoveryService,
    changePasswordService: ChangePasswordService,
  ) {
    this.passwordRecoveryService = passwordRecoveryService;
    this.changePasswordService = changePasswordService;

    this.requestRecovery = this.requestRecovery.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }

  async requestRecovery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as PasswordRecoveryRequestDto;
      await this.passwordRecoveryService.requestRecovery(email);
      res.status(200).json({ message: 'Recovery email sent successfully' });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body as PasswordResetRequestDto;
      await this.passwordRecoveryService.resetPassword(token, newPassword);
      res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = (req as any).session;
      const { currentPassword, newPassword } = req.body as ChangePasswordRequestDto;
      await this.changePasswordService.changePassword(userId, currentPassword, newPassword);
      res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
      next(error);
    }
  }
}