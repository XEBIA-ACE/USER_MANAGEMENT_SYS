```typescript
import { useState, useEffect, useCallback } from "react";
import { UserProfileResponse, ProfileErrorResponse } from "../types/profile.types";
import { getUserProfile } from "./api-client";

export interface UseCurrentUserResult {
  user: UserProfileResponse | null;
  loading: boolean;
  error: ProfileErrorResponse | null;
  refetch: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ProfileErrorResponse | null>(null);

  const fetchUser = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      setUser(profile);
    } catch (err) {
      setError(err as ProfileErrorResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
```