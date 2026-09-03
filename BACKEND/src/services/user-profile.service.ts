import { IUserRepository } from '../repositories/user.repository';
import { UserProfileResult } from '../types/user-profile.types';
import { ValidationError } from '../errors/registration.errors';
import { UserNotFoundException } from '../errors/registration.errors';

const NAME_MAX_LENGTH = 100;
const NAME_PATTERN = /^[\p{L}\p{M}'\- ]+$/u;

class NameValidator {
  static validate(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Name must be a non-empty string.');
    }
    if (name.length > NAME_MAX_LENGTH) {
      throw new ValidationError(
        `Name must not exceed ${NAME_MAX_LENGTH} characters.`
      );
    }
    if (!NAME_PATTERN.test(name)) {
      throw new ValidationError(
        "Name may only contain letters, marks, apostrophes, hyphens, and spaces."
      );
    }
  }
}

export interface UserProfileService {
  getProfile(userId: string): Promise<UserProfileResult>;
  updateName(userId: string, name: string): Promise<void>;
}

export class DefaultUserProfileService implements UserProfileService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<UserProfileResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(`User with id '${userId}' not found.`);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  async updateName(userId: string, name: string): Promise<void> {
    NameValidator.validate(name);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException(`User with id '${userId}' not found.`);
    }

    await this.userRepository.updateName(userId, name);
  }
}