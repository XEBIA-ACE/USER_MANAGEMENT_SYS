import request from 'supertest';
import { Express } from 'express';
import { buildProtectedTestApp } from './helpers/build-protected-test-app';

describe('User Profile Integration — edit-name flow', () => {
  let app: Express;
  let teardown: () => Promise<void>;

  const baseUser = {
    email: `test-edit-name-${Date.now()}@example.com`,
    password: 'Integration$Test1',
    name: 'Original Name',
  };

  beforeAll(async () => {
    const result = await buildProtectedTestApp();
    app = result.app;
    teardown = result.teardown;
  });

  afterAll(async () => {
    if (teardown) {
      await teardown();
    }
  });

  // -----------------------------------------------------------------------
  // Scenario 1: Unauthenticated PATCH → 401
  // -----------------------------------------------------------------------
  describe('PATCH /users/me/name — unauthenticated', () => {
    it('should return HTTP 401 when no valid session is present', async () => {
      const response = await request(app)
        .patch('/users/me/name')
        .send({ name: 'Some New Name' })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // Scenario 2: Authenticated PATCH with invalid name → 422
  // -----------------------------------------------------------------------
  describe('PATCH /users/me/name — authenticated, invalid name', () => {
    let sessionCookie: string;
    const userEmail = `test-invalid-name-${Date.now()}@example.com`;

    beforeAll(async () => {
      // Register
      await request(app)
        .post('/users/register')
        .send({ email: userEmail, password: baseUser.password, name: baseUser.name })
        .set('Content-Type', 'application/json');

      // Login and capture session cookie
      const loginResponse = await request(app)
        .post('/users/login')
        .send({ email: userEmail, password: baseUser.password })
        .set('Content-Type', 'application/json');

      const cookies = loginResponse.headers['set-cookie'] as string[] | string;
      sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
    });

    it('should return HTTP 422 with a descriptive error message for a name exceeding 100 characters', async () => {
      const tooLongName = 'A'.repeat(101);

      const response = await request(app)
        .patch('/users/me/name')
        .send({ name: tooLongName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should return HTTP 422 with a descriptive error message for a name containing invalid characters', async () => {
      const invalidName = 'Name<script>alert(1)</script>';

      const response = await request(app)
        .patch('/users/me/name')
        .send({ name: invalidName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should return HTTP 422 with a descriptive error message for an empty name', async () => {
      const response = await request(app)
        .patch('/users/me/name')
        .send({ name: '' })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Scenario 3: Authenticated PATCH with valid name → 200, then GET → updated name
  // -----------------------------------------------------------------------
  describe('PATCH /users/me/name — authenticated, valid name, then GET /users/me', () => {
    let sessionCookie: string;
    const userEmail = `test-valid-name-${Date.now()}@example.com`;
    const updatedName = 'Updated Valid Name';

    beforeAll(async () => {
      // Register
      await request(app)
        .post('/users/register')
        .send({ email: userEmail, password: baseUser.password, name: baseUser.name })
        .set('Content-Type', 'application/json');

      // Login and capture session cookie
      const loginResponse = await request(app)
        .post('/users/login')
        .send({ email: userEmail, password: baseUser.password })
        .set('Content-Type', 'application/json');

      const cookies = loginResponse.headers['set-cookie'] as string[] | string;
      sessionCookie = Array.isArray(cookies) ? cookies[0] : cookies;
    });

    it('should return HTTP 200 with the updated profile after a valid PATCH', async () => {
      const patchResponse = await request(app)
        .patch('/users/me/name')
        .send({ name: updatedName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body).toBeDefined();
      expect(patchResponse.body.name).toBe(updatedName);
    });

    it('should reflect the updated name on a subsequent GET /users/me', async () => {
      // Perform the PATCH first
      await request(app)
        .patch('/users/me/name')
        .send({ name: updatedName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      // Then verify GET returns the new name
      const getResponse = await request(app)
        .get('/users/me')
        .set('Cookie', sessionCookie);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toBeDefined();
      expect(getResponse.body.name).toBe(updatedName);
    });

    it('should support names with Unicode letters, hyphens, apostrophes, and spaces', async () => {
      const unicodeName = "José O'Brien-Müller";

      const patchResponse = await request(app)
        .patch('/users/me/name')
        .send({ name: unicodeName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.name).toBe(unicodeName);

      const getResponse = await request(app)
        .get('/users/me')
        .set('Cookie', sessionCookie);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.name).toBe(unicodeName);
    });

    it('should support a name at exactly 100 characters (boundary)', async () => {
      const boundaryName = 'A'.repeat(100);

      const patchResponse = await request(app)
        .patch('/users/me/name')
        .send({ name: boundaryName })
        .set('Content-Type', 'application/json')
        .set('Cookie', sessionCookie);

      expect(patchResponse.status).toBe(200);
      expect(patchResponse.body.name).toBe(boundaryName);
    });
  });
});