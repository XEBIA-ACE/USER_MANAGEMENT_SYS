import { Request, Response } from 'express';
import { UserProfileController } from './user-profile.controller';
import { UserProfileService } from '../services/user-profile.service';
import { ValidationError, UserNotFoundException } from '../errors/registration.errors';

const mockUserProfileService: jest.Mocked<UserProfileService> = {
  getProfile: jest.fn(),
  updateName: jest.fn(),
};

const controller = new UserProfileController(mockUserProfileService);

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('UserProfileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return 200 with user profile on success', async () => {
      const profile = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
      mockUserProfileService.getProfile.mockResolvedValue(profile as any);

      const req = { session: { userId: 'user-1' } } as unknown as Request;
      const res = mockResponse() as Response;

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(profile);
    });

    it('should return 404 when UserNotFoundException is thrown', async () => {
      mockUserProfileService.getProfile.mockRejectedValue(new UserNotFoundException('user-1'));

      const req = { session: { userId: 'user-1' } } as unknown as Request;
      const res = mockResponse() as Response;

      await controller.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateName', () => {
    it('should return 422 when service throws ValidationError', async () => {
      const validationError = new ValidationError('Name contains invalid characters');
      mockUserProfileService.updateName.mockRejectedValue(validationError);

      const req = {
        session: { userId: 'user-1' },
        body: { name: '###invalid###' },
      } as unknown as Request;
      const res = mockResponse() as Response;

      await controller.updateName(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: validationError.message })
      );
    });

    it('should return 404 when service throws UserNotFoundException', async () => {
      mockUserProfileService.updateName.mockRejectedValue(
        new UserNotFoundException('user-99')
      );

      const req = {
        session: { userId: 'user-99' },
        body: { name: 'Valid Name' },
      } as unknown as Request;
      const res = mockResponse() as Response;

      await controller.updateName(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 200 with updated profile when service resolves successfully', async () => {
      const updatedProfile = { id: 'user-1', name: 'New Name', email: 'alice@example.com' };
      mockUserProfileService.updateName.mockResolvedValue(undefined);
      mockUserProfileService.getProfile.mockResolvedValue(updatedProfile as any);

      const req = {
        session: { userId: 'user-1' },
        body: { name: 'New Name' },
      } as unknown as Request;
      const res = mockResponse() as Response;

      await controller.updateName(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedProfile);
    });
  });
});