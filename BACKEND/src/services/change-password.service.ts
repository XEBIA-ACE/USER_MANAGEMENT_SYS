import { IUserRepository } from '../repositories/user.repository';
import { PasswordHasher } from './password-hasher.service';
import { PasswordPolicyEvaluator } from './password-policy.evaluator';
import { passwordPolicyConfig } from '../config/password-policy.config';
import { withTransaction } from '../db/connection';
import { UserNotFoundException } from '../errors/user.errors';
import { IncorrectCurrentPasswordException, PasswordPolicyViolationException } from '../errors/login.errors';

export interface ChangePasswordService {
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
}

export class DefaultChangePasswordService implements ChangePasswordService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly passwordPolicyEvaluator: PasswordPolicyEvaluator
  ) {}

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    const isCurrentPasswordValid = await this.passwordHasher.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new IncorrectCurrentPasswordException();
    }

    const policyResult = this.passwordPolicyEvaluator.evaluate(
      newPassword,
      passwordPolicyConfig
    );
    if (!policyResult.isValid) {
      throw new PasswordPolicyViolationException(policyResult.violations);
    }

    const newPasswordHash = await this.passwordHasher.hash(newPassword);

    await withTransaction(async (client) => {
      await this.userRepository.updatePasswordHash(userId, newPasswordHash, client);
    });
  }
}