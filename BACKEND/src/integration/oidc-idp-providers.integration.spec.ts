process.env.ADMIN_BEARER_TOKEN = 'test-admin-token';
process.env.SENDGRID_API_KEY = 'SG.test-key';
process.env.SENDGRID_TEMPLATE_ID = 'd-test-template';
process.env.ACTIVATION_BASE_URL = 'https://example.test';
process.env.FROM_EMAIL = 'no-reply@example.test';
process.env.PASSWORD_RECOVERY_BASE_URL = 'https://example.test';
process.env.PASSWORD_RECOVERY_EMAIL_TEMPLATE_ID = 'd-test-recovery-template';

import request from 'supertest';
import express from 'express';
import type { Database } from 'better-sqlite3';
import { createAuthRouter } from '../routes/auth.routes';
import { createTestDb, closeTestDb, TestDb } from './test-db';

const OIDC_ENV_KEYS = [
  'OIDC_OKTA_ENABLED', 'OIDC_OKTA_CLIENT_ID', 'OIDC_OKTA_AUTH_ENDPOINT', 'OIDC_OKTA_REDIRECT_URI',
  'OIDC_AZURE_AD_ENABLED', 'OIDC_AZURE_AD_CLIENT_ID', 'OIDC_AZURE_AD_AUTH_ENDPOINT', 'OIDC_AZURE_AD_REDIRECT_URI',
  'OIDC_GOOGLE_ENABLED', 'OIDC_GOOGLE_CLIENT_ID', 'OIDC_GOOGLE_AUTH_ENDPOINT', 'OIDC_GOOGLE_REDIRECT_URI',
];

const REDIRECT_URI = 'https://app.example.test/auth/callback';

function enableOkta(): void {
  process.env.OIDC_OKTA_ENABLED = 'true';
  process.env.OIDC_OKTA_CLIENT_ID = 'okta-client';
  process.env.OIDC_OKTA_AUTH_ENDPOINT = 'https://okta.example.test/oauth2/v1/authorize';
  process.env.OIDC_OKTA_REDIRECT_URI = REDIRECT_URI;
}

function enableAzureAd(): void {
  process.env.OIDC_AZURE_AD_ENABLED = 'true';
  process.env.OIDC_AZURE_AD_CLIENT_ID = 'azure-client';
  process.env.OIDC_AZURE_AD_AUTH_ENDPOINT = 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize';
  process.env.OIDC_AZURE_AD_REDIRECT_URI = REDIRECT_URI;
}

function enableGoogle(): void {
  process.env.OIDC_GOOGLE_ENABLED = 'true';
  process.env.OIDC_GOOGLE_CLIENT_ID = 'google-client';
  process.env.OIDC_GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
  process.env.OIDC_GOOGLE_REDIRECT_URI = REDIRECT_URI;
}

let testDb: TestDb;
let db: Database;

/** The auth router reads OIDC env at construction, so build a fresh app per test. */
function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', createAuthRouter(db));
  return app;
}

beforeAll(() => {
  testDb = createTestDb();
  db = testDb.db;
});

beforeEach(() => {
  for (const key of OIDC_ENV_KEYS) delete process.env[key];
});

afterAll(() => {
  for (const key of OIDC_ENV_KEYS) delete process.env[key];
  closeTestDb(testDb);
});

describe('Integration | GET /api/v1/auth/idp-providers', () => {
  test('no OIDC env vars -> 200 with empty providers list', async () => {
    const response = await request(buildApp()).get('/api/v1/auth/idp-providers').expect(200);
    expect(response.body).toEqual({ providers: [] });
  });

  test('one provider enabled -> single-item list', async () => {
    enableOkta();

    const response = await request(buildApp()).get('/api/v1/auth/idp-providers').expect(200);

    expect(response.body.providers).toEqual([
      {
        id: 'okta',
        displayName: 'Okta',
        authorizationEndpoint: 'https://okta.example.test/oauth2/v1/authorize',
        clientId: 'okta-client',
        redirectUri: REDIRECT_URI,
        scope: 'openid profile email',
      },
    ]);
  });

  test('all three providers enabled -> three-item list', async () => {
    enableOkta();
    enableAzureAd();
    enableGoogle();

    const response = await request(buildApp()).get('/api/v1/auth/idp-providers').expect(200);

    expect(response.body.providers.map((p: { id: string }) => p.id)).toEqual([
      'okta',
      'azure-ad',
      'google',
    ]);
  });

  test('disabled providers are not returned', async () => {
    enableOkta();
    enableGoogle();
    process.env.OIDC_GOOGLE_ENABLED = 'false';

    const response = await request(buildApp()).get('/api/v1/auth/idp-providers').expect(200);

    expect(response.body.providers.map((p: { id: string }) => p.id)).toEqual(['okta']);
  });

  test('endpoint is reachable without an Authorization header', async () => {
    enableOkta();

    await request(buildApp()).get('/api/v1/auth/idp-providers').expect(200);
  });
});
