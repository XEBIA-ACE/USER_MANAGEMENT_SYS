"""
tests/test_credential_validator.py
-----------------------------------
Unit tests for auth.credential_validator.

Covers:
  - Password hashing produces a valid bcrypt hash.
  - Each call to hash_password produces a unique salt (different hashes).
  - verify_password returns True for correct password, False for wrong one.
  - validate_credentials raises CredentialValidationError for bad inputs.
  - Minimum password-strength rules are enforced.
  - Type errors are raised for wrong argument types.
"""

import pytest
import bcrypt

from auth.credential_validator import (
    BCRYPT_ROUNDS,
    CredentialValidationError,
    hash_password,
    validate_credentials,
    verify_password,
)


# ---------------------------------------------------------------------------
# hash_password
# ---------------------------------------------------------------------------


class TestHashPassword:
    def test_returns_bytes(self):
        result = hash_password("Secure1!")
        assert isinstance(result, bytes)

    def test_hash_is_valid_bcrypt(self):
        """The returned value must be parseable by bcrypt itself."""
        pw = "Secure1!"
        hashed = hash_password(pw)
        # bcrypt.checkpw will raise ValueError if the hash is malformed
        assert bcrypt.checkpw(pw.encode("utf-8"), hashed)

    def test_unique_salts_per_call(self):
        """Two hashes of the same password must differ (random salt)."""
        pw = "Secure1!"
        hash1 = hash_password(pw)
        hash2 = hash_password(pw)
        assert hash1 != hash2

    def test_cost_factor_embedded_in_hash(self):
        """The bcrypt hash string encodes the configured work factor."""
        hashed = hash_password("Secure1!")
        # bcrypt hash format: $2b$<rounds>$...
        rounds_in_hash = int(hashed.split(b"$")[2])
        assert rounds_in_hash == BCRYPT_ROUNDS

    def test_raises_on_short_password(self):
        with pytest.raises(CredentialValidationError):
            hash_password("abc1")

    def test_raises_on_no_digit(self):
        with pytest.raises(CredentialValidationError):
            hash_password("NoDigitsHere!")

    def test_raises_on_no_alpha(self):
        with pytest.raises(CredentialValidationError):
            hash_password("12345678")

    def test_raises_on_non_string(self):
        with pytest.raises(TypeError):
            hash_password(12345678)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# verify_password
# ---------------------------------------------------------------------------


class TestVerifyPassword:
    def test_correct_password_returns_true(self):
        pw = "Correct1!"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_wrong_password_returns_false(self):
        hashed = hash_password("Correct1!")
        assert verify_password("Wrong1!", hashed) is False

    def test_empty_password_returns_false(self):
        hashed = hash_password("Correct1!")
        assert verify_password("", hashed) is False

    def test_raises_on_non_string_plaintext(self):
        hashed = hash_password("Correct1!")
        with pytest.raises(TypeError):
            verify_password(None, hashed)  # type: ignore[arg-type]

    def test_raises_on_non_bytes_hash(self):
        with pytest.raises(TypeError):
            verify_password("Correct1!", "not-bytes")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# validate_credentials
# ---------------------------------------------------------------------------


class TestValidateCredentials:
    def test_valid_credentials_do_not_raise(self):
        # Should complete without raising
        validate_credentials("alice@example.com", "Valid1pass")

    def test_empty_username_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials("", "Valid1pass")

    def test_short_username_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials("ab", "Valid1pass")

    def test_none_username_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials(None, "Valid1pass")  # type: ignore[arg-type]

    def test_weak_password_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials("alice", "short")

    def test_password_without_digit_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials("alice", "NoDigitsHere")

    def test_password_without_alpha_raises(self):
        with pytest.raises(CredentialValidationError):
            validate_credentials("alice", "12345678")
