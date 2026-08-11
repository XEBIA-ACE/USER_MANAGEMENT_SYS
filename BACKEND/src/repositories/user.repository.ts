```typescript
export interface User {
  email: string;
  name: string;
  createdAt: Date;
}

export class UserRepository {
  async addUser(user: User): Promise<void> {
    // Simulating adding user to a database
    console.log('User added to the database:', user);
  }
}
```