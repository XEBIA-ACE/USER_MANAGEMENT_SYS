export interface LoginRequestEntity {
  email: string;
  password: string;
}

export interface LoginResponseEntity {
  token: string;
  userId: string;
  email: string;
}

export interface SessionEntity {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserSessionEntity {
  id: string;
  userId: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface RefreshTokenRequestEntity {
  token: string;
}

export interface RefreshTokenResponseEntity {
  token: string;
}

export interface LogoutRequestEntity {
  token: string;
}

export interface ValidateSessionRequestEntity {
  token: string;
}

export interface ValidateSessionResponseEntity {
  valid: boolean;
  userId: string;
}

export interface PasswordRecoveryRequestEntity {
  email: string;
}

export interface PasswordResetRequestEntity {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequestDto {
  currentPassword: string;
  newPassword: string;
}