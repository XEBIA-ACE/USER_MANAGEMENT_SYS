import request from 'supertest';
import bcrypt from 'bcrypt';
import { createApp } from '../app';
import { getConnection } from '../db/connection';
import { UserRepository } from '../repositories/user.repository';

describe('POST /password/change — Integration', () => {
  let app: Express.Application;
  let userRepository: UserRepository;
  let db: ReturnType<typeof getConnection>;

  const TEST_USER_EMAIL = `change-password-integration-${Date.now()}@example.com`;
  const TEST_USER_USERNAME = `changepw_${Date.now()}`;
  const KNOWN_PASSWORD = 'CorrectHorse99!';
  const NEW_VALID_PASSWORD = 'NewValidPass99!';
  const WEAK_PASSWORD = 'weak';
  const WRONG_PASSWORD = 'WrongPassword99!';

  let testUserId: string;
  let initialPasswordHash: string;
  let sessionCookie: string;

  beforeAll(async () => {
    db = getConnection();
    userRepository = new UserRepository(db);
    app = createApp();

    // Seed a test user with a known password hash
    const saltRounds = 10;
    initialPasswordHash = await bcrypt.hash(KNOWN_PASSWORD, saltRounds);

    const result = await db.query<{ id: string }>(
      `INSERT INTO users (email, username, password_hash, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id`,
      [TEST_USER_EMAIL, TEST_USER_USERNAME, initialPasswordHash, true]
    );

    testUserId = result.rows[0].id;

    // Obtain a valid session by logging in
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER_EMAIL, password: KNOWN_PASSWORD })
      .expect(200);

    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (!setCookieHeader) {
      throw new Error('No session cookie returned after login');
    }
    sessionCookie = Array.isArray(setCookieHeader)
      ? setCookieHeader[0]
      : setCookieHeader;
  });

  afterAll(async () => {
    // Clean up test user
    if (testUserId) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [testUserId]);
      await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
  });

  describe('Unauthenticated request', () => {
    it('returns 401 when no session cookie is present', async () => {
      const response = await request(app)
        .post('/password/change')
        .send({
          currentPassword: KNOWN_PASSWORD,
          newPassword: NEW_VALID_PASSWORD,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Successful password change', () => {
    it('returns 200 and updates the password hash in the database', async () => {
      const response = await request(app)
        .post('/password/change')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: KNOWN_PASSWORD,
          newPassword: NEW_VALID_PASSWORD,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ message: 'Password updated successfully' });

      // Verify the hash has changed in the database
      const updatedUser = await userRepository.findById(testUserId);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.passwordHash).not.toBe(initialPasswordHash);

      // Verify the new hash matches the new password
      const newHashIsValid = await bcrypt.compare(
        NEW_VALID_PASSWORD,
        updatedUser!.passwordHash
      );
      expect(newHashIsValid).toBe(true);

      // Verify the old hash no longer matches
      const oldHashStillValid = await bcrypt.compare(
        KNOWN_PASSWORD,
        updatedUser!.passwordHash
      );
      expect(oldHashStillValid).toBe(false);

      // Re-login with new password to obtain fresh session for subsequent tests
      const reLoginResponse = await request(app)
        .post('/auth/login')
        .send({ email: TEST_USER_EMAIL, password: NEW_VALID_PASSWORD })
        .expect(200);

      const setCookieHeader = reLoginResponse.headers['set-cookie'];
      if (setCookieHeader) {
        sessionCookie = Array.isArray(setCookieHeader)
          ? setCookieHeader[0]
          : setCookieHeader;
      }

      // Also restore password hash state for subsequent tests
      const restoredHash = await bcrypt.hash(KNOWN_PASSWORD, 10);
      await db.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [restoredHash, testUserId]
      );

      // Re-login with restored password to fix session for subsequent tests
      const restoreLoginResponse = await request(app)
        .post('/auth/login')
        .send({ email: TEST_USER_EMAIL, password: KNOWN_PASSWORD })
        .expect(200);

      const restoreCookie = restoreLoginResponse.headers['set-cookie'];
      if (restoreCookie) {
        sessionCookie = Array.isArray(restoreCookie)
          ? restoreCookie[0]
          : restoreCookie;
      }
    });
  });

  describe('Wrong current password', () => {
    it('returns 400 and leaves the password hash unchanged in the database', async () => {
      // Capture the hash before the attempt
      const userBefore = await userRepository.findById(testUserId);
      const hashBefore = userBefore!.passwordHash;

      const response = await request(app)
        .post('/password/change')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: WRONG_PASSWORD,
          newPassword: NEW_VALID_PASSWORD,
        });

      expect(response.status).toBe(400);

      // Verify the hash is unchanged in the database
      const userAfter = await userRepository.findById(testUserId);
      expect(userAfter!.passwordHash).toBe(hashBefore);
    });
  });

  describe('Policy violation — weak new password', () => {
    it('returns 400 and leaves the password hash unchanged in the database', async () => {
      // Capture the hash before the attempt
      const userBefore = await userRepository.findById(testUserId);
      const hashBefore = userBefore!.passwordHash;

      const response = await request(app)
        .post('/password/change')
        .set('Cookie', sessionCookie)
        .send({
          currentPassword: KNOWN_PASSWORD,
          newPassword: WEAK_PASSWORD,
        });

      expect(response.status).toBe(400);

      // Verify the hash is unchanged in the database
      const userAfter = await userRepository.findById(testUserId);
      expect(userAfter!.passwordHash).toBe(hashBefore);
    });
  });
});