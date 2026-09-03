import { HttpException } from './http.exception';

export class InvalidCredentialsException extends HttpException {
  constructor(message: string = 'Invalid credentials') {
    super(401, message);
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(message: string = 'User already exists') {
    super(409, message);
  }
}

export class UserNotFoundException extends HttpException {
  constructor(message: string = 'User not found') {
    super(404, message);
  }
}

export class SessionNotFoundException extends HttpException {
  constructor(message: string = 'Session not found') {
    super(404, message);
  }
}

export class SessionExpiredException extends HttpException {
  constructor(message: string = 'Session has expired') {
    super(401, message);
  }
}

export class InvalidSessionTokenException extends HttpException {
  constructor(message: string = 'Invalid session token') {
    super(401, message);
  }
}

export class PasswordRecoveryTokenNotFoundException extends HttpException {
  constructor(message: string = 'Password recovery token not found') {
    super(404, message);
  }
}

export class PasswordRecoveryTokenExpiredException extends HttpException {
  constructor(message: string = 'Password recovery token has expired') {
    super(400, message);
  }
}

export class PasswordRecoveryTokenAlreadyUsedException extends HttpException {
  constructor(message: string = 'Password recovery token has already been used') {
    super(400, message);
  }
}

export class PasswordPolicyViolationException extends HttpException {
  constructor(message: string = 'Password does not meet policy requirements') {
    super(400, message);
  }
}

export class IncorrectCurrentPasswordException extends HttpException {
  constructor(message: string = 'Current password is incorrect') {
    super(400, message);
  }
}