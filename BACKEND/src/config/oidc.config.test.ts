import { loadOidcConfig } from './oidc.config';

const OKTA_ENV = {
  OIDC_OKTA_ENABLED: 'true',
  OIDC_OKTA_CLIENT_ID: 'okta-client',
  OIDC_OKTA_AUTH_ENDPOINT: 'https://okta.example.test/oauth2/v1/authorize',
  OIDC_OKTA_REDIRECT_URI: 'https://app.example.test/auth/callback',
};

const AZURE_ENV = {
  OIDC_AZURE_AD_ENABLED: 'true',
  OIDC_AZURE_AD_CLIENT_ID: 'azure-client',
  OIDC_AZURE_AD_AUTH_ENDPOINT: 'https://login.microsoftonline.com/tenant/oauth2/v2.0/authorize',
  OIDC_AZURE_AD_REDIRECT_URI: 'https://app.example.test/auth/callback',
};

const GOOGLE_ENV = {
  OIDC_GOOGLE_ENABLED: 'true',
  OIDC_GOOGLE_CLIENT_ID: 'google-client',
  OIDC_GOOGLE_AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
  OIDC_GOOGLE_REDIRECT_URI: 'https://app.example.test/auth/callback',
};

describe('loadOidcConfig', () => {
  test('no env vars -> no providers', () => {
    expect(loadOidcConfig({}).providers).toEqual([]);
  });

  test('disabled providers are omitted even when fully configured', () => {
    const { providers } = loadOidcConfig({ ...OKTA_ENV, OIDC_OKTA_ENABLED: 'false' });
    expect(providers).toEqual([]);
  });

  test('single enabled provider -> one entry with defaults applied', () => {
    const { providers } = loadOidcConfig(OKTA_ENV);
    expect(providers).toEqual([
      {
        id: 'okta',
        displayName: 'Okta',
        enabled: true,
        clientId: 'okta-client',
        authorizationEndpoint: 'https://okta.example.test/oauth2/v1/authorize',
        redirectUri: 'https://app.example.test/auth/callback',
        scope: 'openid profile email',
      },
    ]);
  });

  test('all three providers enabled -> three entries in stable order', () => {
    const { providers } = loadOidcConfig({ ...OKTA_ENV, ...AZURE_ENV, ...GOOGLE_ENV });
    expect(providers.map((p) => p.id)).toEqual(['okta', 'azure-ad', 'google']);
    expect(providers.map((p) => p.displayName)).toEqual(['Okta', 'Azure AD', 'Google Workspace']);
  });

  test('custom scope is honoured', () => {
    const { providers } = loadOidcConfig({ ...GOOGLE_ENV, OIDC_GOOGLE_SCOPE: 'openid email' });
    expect(providers[0].scope).toBe('openid email');
  });

  test('enabled provider missing a required value fails fast', () => {
    expect(() => loadOidcConfig({ ...OKTA_ENV, OIDC_OKTA_CLIENT_ID: '' })).toThrow(
      /OIDC_OKTA_CLIENT_ID/,
    );
  });
});
