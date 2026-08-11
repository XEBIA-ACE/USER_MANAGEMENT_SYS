```typescript
import { UserProfileService } from './user-profile.service';
import { UserRepository } from '../repositories/user.repository';

jest.mock('../repositories/user.repository');

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    userRepository = new UserRepository() as jest.Mocked<UserRepository>;
    userProfileService = new UserProfileService();
  });

  it('should create a user profile with valid data', async () => {
    const email = 'test@example.com';
    const name = 'Test User';

    await expect(userProfileService.createProfile(email, name))
      .resolves.not.toThrow();

    expect(userRepository.addUser).toHaveBeenCalledWith({
      email,
      name,
      createdAt: expect.any(Date),
    });
  });

  it('should throw an error if email or name is missing', async () => {
    await expect(userProfileService.createProfile('', ''))
      .rejects.toThrow('Email and name are required.');

    expect(userRepository.addUser).not.toHaveBeenCalled();
  });
});
```