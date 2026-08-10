/**
 * userService.test.js
 *
 * Unit tests for the email-uniqueness check and user-storage logic in
 * userService.js.
 *
 * Uses Jest + mongodb-memory-server so no real MongoDB instance is needed.
 *
 * Install dev dependencies:
 *   npm install --save-dev jest @jest/globals mongodb-memory-server mongoose bcryptjs
 */

'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// ── Lifecycle ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ── Tests ──────────────────────────────────────────────────────────────────────

const {
  registerUser,
  isEmailTaken,
  DuplicateEmailError,
  ValidationError,
} = require('../services/userService');

describe('registerUser', () => {
  const validPayload = {
    name: 'Alice Example',
    email: 'alice@example.com',
    password: 'SecurePass1!',
  };

  test('successfully registers a new user and returns the user document', async () => {
    const user = await registerUser(validPayload);

    expect(user).toBeDefined();
    expect(user.email).toBe('alice@example.com');
    expect(user.name).toBe('Alice Example');
    // Password hash must NOT be exposed
    expect(user.toJSON().passwordHash).toBeUndefined();
  });

  test('stores the password as a bcrypt hash, not plain-text', async () => {
    const user = await registerUser(validPayload);
    // Access the raw document field (not the toJSON-stripped version)
    const raw = await mongoose.model('User').findById(user._id).select('+passwordHash');
    expect(raw.passwordHash).not.toBe(validPayload.password);
    expect(raw.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
  });

  test('throws DuplicateEmailError when email already exists', async () => {
    await registerUser(validPayload);

    await expect(registerUser(validPayload)).rejects.toThrow(DuplicateEmailError);
    await expect(registerUser(validPayload)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('duplicate check is case-insensitive', async () => {
    await registerUser(validPayload);

    await expect(
      registerUser({ ...validPayload, email: 'ALICE@EXAMPLE.COM' })
    ).rejects.toThrow(DuplicateEmailError);
  });

  test('throws ValidationError when name is missing', async () => {
    await expect(
      registerUser({ ...validPayload, name: '' })
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError when email is invalid', async () => {
    await expect(
      registerUser({ ...validPayload, email: 'not-an-email' })
    ).rejects.toThrow(ValidationError);
  });

  test('throws ValidationError when password is too short', async () => {
    await expect(
      registerUser({ ...validPayload, password: 'short' })
    ).rejects.toThrow(ValidationError);
  });
});

describe('isEmailTaken', () => {
  test('returns false for an email that has not been registered', async () => {
    const taken = await isEmailTaken('nobody@example.com');
    expect(taken).toBe(false);
  });

  test('returns true after the email has been registered', async () => {
    await registerUser({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'SecurePass1!',
    });

    const taken = await isEmailTaken('bob@example.com');
    expect(taken).toBe(true);
  });
});
