```python
class PasswordRecoveryService:
    def recover_password(self, email):
        user = User.get_by_email(email)
        if not user:
            return False

        token = self.generate_token(email)
        return send_recovery_email(email, token)

    def generate_token(self, email):
        return generate_secure_token(email)

def send_recovery_email(email, token):
    # Simulates sending an email - Placeholder for actual email service
    print(f"Sending email to {email} with token {token}")
    return True

def generate_secure_token(email):
    # Placeholder for secure token generation
    return "securetoken123"

class User:
    @staticmethod
    def get_by_email(email):
        # Should interact with database, mock for now
        if email == "test@example.com":
            return User()
        return None
```