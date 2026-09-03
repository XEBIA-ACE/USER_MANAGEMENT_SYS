import { DefaultChangePasswordService } from './change-password.service';
import { IUserRepository } from '../types/repository.types';
import { PasswordHasher } from '../types/registration.types';
import { PasswordPolicyEvaluator } from '../types/registration.types';
import { UserNotFoundException } from '../errors/login.errors';
import { IncorrectCurrentPasswordException } from '../errors/login.errors';
import { PasswordPolicyViolationException } from '../errors/login.errors';

// Mock withTransaction to execute the callback immediately
jest.mock('../db/connection', () => ({
  withTransaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
    callback({})
  ),
}));

import { withTransaction } from '../db/connection';

describe('DefaultChangePasswordService', () => {
  let service: DefaultChangePasswordService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordHasher: jest.Mocked<PasswordHasher>;
  let mockPolicyEvaluator: jest.Mocked<PasswordPolicyEvaluator>;

  const userId = 'user-123';
  const currentPassword = 'CurrentPass1!';
  const newPassword = 'NewSecurePass2@';
  const hashedNewPassword = 'hashed-new-password';

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed-current-password',
    username: 'testuser',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      updatePasswordHash: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    mockPasswordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as jest.Mocked<PasswordHasher>;

    mockPolicyEvaluator = {
      evaluate: jest.fn(),
    } as jest.Mocked<PasswordPolicyEvaluator>;

    service = new DefaultChangePasswordService(
      mockUserRepository,
      mockPasswordHasher,
      mockPolicyEvaluator
    );
  });

  describe('success case', () => {
    it('should update the password hash when all inputs are valid', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockPolicyEvaluator.evaluate.mockReturnValue({ isValid: true, violations: [] });
      mockPasswordHasher.hash.mockResolvedValue(hashedNewPassword);
      mockUserRepository.updatePasswordHash.mockResolvedValue(undefined);

      // Act
      await service.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalledWith(
        userId,
        hashedNewPassword,
        expect.anything()
      );
    });
  });

  describe('user not found', () => {
    it('should throw UserNotFoundException when the user does not exist', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(UserNotFoundException);

      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('wrong current password', () => {
    it('should throw IncorrectCurrentPasswordException when current password does not match', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordHasher.compare.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(IncorrectCurrentPasswordException);

      expect(mockPolicyEvaluator.evaluate).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('policy violation', () => {
    it('should throw PasswordPolicyViolationException when new password violates policy rules', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockPolicyEvaluator.evaluate.mockReturnValue({
        isValid: false,
        violations: ['Password must contain at least one uppercase letter'],
      });

      // Act & Assert
      await expect(
        service.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(PasswordPolicyViolationException);

      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.updatePasswordHash).not.toHaveBeenCalled();
    });
  });

  describe('hashing', () => {
    it('should hash the new plain-text password before storing it', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockPolicyEvaluator.evaluate.mockReturnValue({ isValid: true, violations: [] });
      mockPasswordHasher.hash.mockResolvedValue(hashedNewPassword);
      mockUserRepository.updatePasswordHash.mockResolvedValue(undefined);

      // Act
      await service.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith(newPassword);
      expect(mockPasswordHasher.hash).toHaveBeenCalledTimes(1);
    });
  });

  describe('transaction', () => {
    it('should wrap the updatePasswordHash call in a withTransaction block', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockPolicyEvaluator.evaluate.mockReturnValue({ isValid: true, violations: [] });
      mockPasswordHasher.hash.mockResolvedValue(hashedNewPassword);
      mockUserRepository.updatePasswordHash.mockResolvedValue(undefined);

      // Act
      await service.changePassword(userId, currentPassword, newPassword);

      // Assert
      expect(withTransaction).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.updatePasswordHash).toHaveBeenCalled();
    });
  });
});