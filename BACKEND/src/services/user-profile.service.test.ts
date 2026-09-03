import { DefaultUserProfileService } from './user-profile.service';
import { IUserRepository } from '../repositories/user.repository';
import { UserEntity } from '../types/registration.types';
import { ValidationError, UserNotFoundException } from '../errors/registration.errors';

const mockUserRepository: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  updatePasswordHash: jest.fn(),
  updateLastLoginAt: jest.fn(),
  updateName: jest.fn(),
};

const service = new DefaultUserProfileService(mockUserRepository); // symbol: 5fdcfe40eda91b1a

const mockUser: UserEntity = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  createdAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-02'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DefaultUserProfileService', () => {
  describe('getProfile', () => {
    it('should return a user profile result when user exists', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-123');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockUser.name);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw UserNotFoundException when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('unknown-user')).rejects.toThrow(UserNotFoundException);
    });
  });

  describe('updateName', () => {
    it('should throw ValidationError when name is empty', async () => {
      await expect(service.updateName('user-123', '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name exceeds 100 characters', async () => {
      const longName = 'a'.repeat(101);

      await expect(service.updateName('user-123', longName)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when name contains invalid characters', async () => {
      const invalidName = '<script>alert("xss")</script>';

      await expect(service.updateName('user-123', invalidName)).rejects.toThrow(ValidationError);
    });

    it('should throw UserNotFoundException when userId does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.updateName('unknown-user-id', 'Valid Name')).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('should resolve without error and call updateName on the repository with correct arguments for a valid name and existing user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateName.mockResolvedValue(undefined);

      await expect(service.updateName('user-123', 'New Valid Name')).resolves.toBeUndefined();

      expect(mockUserRepository.updateName).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.updateName).toHaveBeenCalledWith('user-123', 'New Valid Name');
    });
  });
});