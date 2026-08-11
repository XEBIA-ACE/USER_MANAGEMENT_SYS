-- 009_create_user_profiles.sql
--
-- Creates the user_profiles table for the Create User Profile feature.
--
-- GDPR compliance notes:
--   - phone_number_hash: stores a SHA-256 hash of the phone number only;
--     the plaintext value is never persisted (data minimisation, Art. 25).
--   - birth_year: stores only the year extracted from the date of birth;
--     the full date is discarded after extraction (data minimisation, Art. 5(1)(c)).
--   - display_name, bio, avatar_url: can be set to '[deleted]' / NULL by the
--     anonymisation routine when a GDPR erasure request (Art. 17) is processed.

CREATE TABLE IF NOT EXISTS user_profiles (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           TEXT    NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name      TEXT    NOT NULL,
  bio               TEXT,
  avatar_url        TEXT,
  -- SHA-256 hex digest of the E.164 phone number; plaintext is never stored.
  phone_number_hash TEXT,
  -- Only the birth year is retained to minimise personal data exposure.
  birth_year        INTEGER,
  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
