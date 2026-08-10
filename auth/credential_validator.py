"""
credential_validator.py
-----------------------
Secure credential validation module for the User Management System (UMS).

Responsibilities:
  - Hash passwords with bcrypt (adaptive cost factor + per-password salt).
  - Verify a plaintext password against a stored bcrypt hash.
  - Validate credential inputs before hashing/verification.

Security notes:
  - bcrypt automatically generates a cryptographically-random salt per hash.
  - The work factor (BCRYPT_ROUNDS) is intentionally tunable; OWASP recommends
    a minimum of 10 rounds (≈100 ms on modern hardware).
  - Plaintext passwords are never stored or logged.
  - Constant-time comparison is handled internally by bcrypt.checkpw().
"""

import logging
import re
from typing import Optional

import bcrypt

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# OWASP-recommended minimum: 10.  Increase for higher-security deployments.
BCRYPT_ROUNDS: int = 12

# Minimum password length enforced before hashing.
MIN_PASSWORD_LENGTH: int = 8

# Basic email pattern used for username/email validation.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------


class CredentialValidationError(ValueError):
    """Raised when credential inputs fail validation checks."""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def hash_password(plaintext_password: str) -> bytes:
    """Hash *plaintext_password* using bcrypt with a random salt.

    Args:
        plaintext_password: The user-supplied password in plaintext.

    Returns:
        A bcrypt hash (bytes) that includes the embedded salt and cost factor.
        Store this value directly in the database — never store the plaintext.

    Raises:
        CredentialValidationError: If the password fails minimum requirements.
        TypeError: If *plaintext_password* is not a string.
    """
    _validate_password_strength(plaintext_password)

    # bcrypt.gensalt() generates a cryptographically-random 16-byte salt and
    # encodes the cost factor into the resulting hash string.
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed: bytes = bcrypt.hashpw(plaintext_password.encode("utf-8"), salt)

    logger.debug("Password hashed successfully (rounds=%d).", BCRYPT_ROUNDS)
    return hashed


def verify_password(plaintext_password: str, hashed_password: bytes) -> bool:
    """Verify *plaintext_password* against a stored bcrypt *hashed_password*.

    Uses bcrypt's constant-time comparison to prevent timing attacks.

    Args:
        plaintext_password: The password provided by the user at login.
        hashed_password:    The bcrypt hash retrieved from the database.

    Returns:
        ``True`` if the password matches, ``False`` otherwise.

    Raises:
        TypeError: If either argument has an unexpected type.
    """
    if not isinstance(plaintext_password, str):
        raise TypeError("plaintext_password must be a str.")
    if not isinstance(hashed_password, bytes):
        raise TypeError("hashed_password must be bytes.")

    try:
        match: bool = bcrypt.checkpw(
            plaintext_password.encode("utf-8"), hashed_password
        )
    except Exception as exc:  # pragma: no cover — guard against malformed hashes
        logger.warning("bcrypt.checkpw raised an unexpected error: %s", exc)
        return False

    if not match:
        logger.warning("Credential verification failed (password mismatch).")
    return match


def validate_credentials(username: str, plaintext_password: str) -> None:
    """Validate that *username* and *plaintext_password* meet basic requirements.

    This is a lightweight pre-check intended to be called before any database
    lookup, so obviously invalid inputs are rejected early.

    Args:
        username:           The username or email address supplied by the user.
        plaintext_password: The password supplied by the user.

    Raises:
        CredentialValidationError: If either field is missing or malformed.
    """
    if not username or not isinstance(username, str):
        raise CredentialValidationError("Username must be a non-empty string.")

    username = username.strip()
    if len(username) < 3:
        raise CredentialValidationError(
            "Username must be at least 3 characters long."
        )

    _validate_password_strength(plaintext_password)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_password_strength(password: str) -> None:
    """Enforce minimum password-strength requirements.

    Args:
        password: Plaintext password to validate.

    Raises:
        CredentialValidationError: If the password does not meet requirements.
        TypeError: If *password* is not a string.
    """
    if not isinstance(password, str):
        raise TypeError("password must be a str.")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise CredentialValidationError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
        )

    # Encourage complexity: require at least one digit and one letter.
    if not any(c.isalpha() for c in password):
        raise CredentialValidationError(
            "Password must contain at least one alphabetic character."
        )
    if not any(c.isdigit() for c in password):
        raise CredentialValidationError(
            "Password must contain at least one numeric character."
        )
