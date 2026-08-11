```markdown
# API Reference

## User Profile Endpoint

### `/user-profile`

The `/user-profile` endpoint is designed for creating a user profile to enhance the onboarding experience. It allows users to input both required and optional profile information.

- **Method**: `POST`
- **URL**: `/user-profile`
- **Authentication**: Required

### Request Format

**Headers**

- `Authorization`: Bearer token for authenticated users
- `Content-Type`: `application/json`

**Body**

The request body must be in JSON format, including the following properties:

```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string", // Optional
  "dateOfBirth": "string", // Optional, format: YYYY-MM-DD
  "address": {
    "street": "string",
    "city": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```

### Response Format

#### Success (Profile Created)

- **Status Code**: `201 Created`
- **Body**:

```json
{
  "message": "Profile successfully created",
  "userId": "string", // Unique identifier for the created user profile
  "confirmationEmailSent": true
}
```

#### Error Responses

- **400 Bad Request**: If there is a validation error on the input data
  - Example:

  ```json
  {
    "error": "Validation Error",
    "details": "Email is required"
  }
  ```

- **401 Unauthorized**: If the user is not authenticated
  - Example:

  ```json
  {
    "error": "Unauthorized",
    "message": "You need to log in to access this resource"
  }
  ```

- **409 Conflict**: If a profile with the provided email already exists
  - Example:

  ```json
  {
    "error": "Username Conflict",
    "message": "A user with this email already exists"
  }
  ```

- **500 Internal Server Error**: For unexpected server issues
  - Example:

  ```json
  {
    "error": "Internal Server Error",
    "message": "An unexpected error occurred. Please try again later."
  }
  ```

### Error Handling

The endpoint provides detailed error messages for validation issues and authentication failures. It includes structured error codes to help in debugging and integrating with client applications. All error responses follow a consistent structure for easy parsing and display.

### Notes

- Ensure GDPR compliance when handling personal data.
- Confirmation emails are sent upon successful profile creation.
- API is designed for seamless integration within existing authorization frameworks.

End of API Reference for `/user-profile`
```