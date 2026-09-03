```typescript
import { UserProfileResponse, ProfileErrorResponse } from "../types/profile.types";

const API_BASE_URL = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let errorBody: ProfileErrorResponse;
  try {
    errorBody = (await response.json()) as ProfileErrorResponse;
  } catch {
    errorBody = {
      message: `Request failed with status ${response.status}`,
      code: String(response.status),
    };
  }
  throw errorBody;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return handleResponse<UserProfileResponse>(response);
}

export async function updateUserName(name: string): Promise<UserProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/users/me/name`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  return handleResponse<UserProfileResponse>(response);
}
```