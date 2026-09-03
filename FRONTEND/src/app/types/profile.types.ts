```typescript
export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
}

export interface ProfileErrorResponse {
  message: string;
  code?: string;
}
```