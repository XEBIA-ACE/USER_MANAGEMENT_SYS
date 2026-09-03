import { authRequest } from "./auth-request";

export interface ApiError {
  message: string;
  errors?: string[];
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return data as ApiError;
  } catch {
    return { message: response.statusText || "An unexpected error occurred" };
  }
}

export async function getUserProfile(): Promise<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}> {
  const response = await authRequest("/user/profile", {
    method: "GET",
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw error;
  }

  return response.json();
}

export async function updateUserProfile(data: {
  firstName: string;
  lastName: string;
}): Promise<void> {
  const response = await authRequest("/user/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw error;
  }
}

export async function deleteAccount(): Promise<void> {
  const response = await authRequest("/user/deletion", {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw error;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const response = await authRequest("/password/change", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw error;
  }
}