```typescript
import { UserRepository } from '../repositories/user.repository';

export class UserProfileService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async createProfile(email: string, name: string): Promise<void> {
    // Simple validation
    if (!email || !name) {
      throw new Error('Email and name are required.');
    }

    const user = { email, name, createdAt: new Date() };
    await this.userRepository.addUser(user);
  }
}
```