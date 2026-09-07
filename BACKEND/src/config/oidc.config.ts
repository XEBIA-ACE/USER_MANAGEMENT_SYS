/**
 * oidc.config.ts
 *
 * Loads per-IdP OIDC configuration from environment variables and exports a
 * strongly-typed list of providers. Supported providers: Okta, Azure AD and
 * Google Workspace. A provider is only included when its `*_ENABLED` flag is
 * `true`; an enabled provider missing any required value fails fast.
 *
 * Env vars (per provider prefix OIDC_OKTA_, OIDC_AZURE_AD_, OIDC_GOOGLE_):
 *   <PREFIX>ENABLED         "true" to enable (default: disabled)
 *   <PREFIX>CLIENT_ID       registered OAuth client id
 *   <PREFIX>AUTH_ENDPOINT   IdP authorization endpoint URL
 *   <PREFIX>REDIRECT_URI    registered redirect URI for the auth code callback
 *   <PREFIX>SCOPE           optional, default "openid profile email"
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OidcProviderId = 'okta' | 'azure-ad' | 'google';

export interface OidcProviderConfig {
  id: OidcProviderId;
  displayName: string;
  enabled: boolean;
  clientId: string;
  authorizationEndpoint: string;
  redirectUri: string;
  scope: string;
}

export interface OidcConfig {
  providers: OidcProviderConfig[];
}

const DEFAULT_SCOPE = 'openid profile email';

const PROVIDER_DEFINITIONS: ReadonlyArray<{
  id: OidcProviderId;
  displayName: string;
  envPrefix: string;
}> = [
  { id: 'okta',     displayName: 'Okta',             envPrefix: 'OIDC_OKTA_' },
  { id: 'azure-ad', displayName: 'Azure AD',         envPrefix: 'OIDC_AZURE_AD_' },
  { id: 'google',   displayName: 'Google Workspace', envPrefix: 'OIDC_GOOGLE_' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Env = Record<string, string | undefined>;

function parseBoolean(env: Env, envKey: string, defaultValue: boolean): boolean {
  const raw = env[envKey];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw.trim().toLowerCase() === 'true';
}

function requireEnvString(env: Env, envKey: string): string {
  const value = env[envKey];
  if (!value || value.trim() === '') {
    throw new Error(
      `Configuration error: required environment variable '${envKey}' is absent or empty.`,
    );
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Builds the OIDC config from the given environment. Disabled providers are
 * omitted entirely so consumers only ever see enabled ones.
 */
export function loadOidcConfig(env: Env = process.env): OidcConfig {
  const providers: OidcProviderConfig[] = [];

  for (const def of PROVIDER_DEFINITIONS) {
    const enabled = parseBoolean(env, `${def.envPrefix}ENABLED`, false);
    if (!enabled) continue;

    providers.push({
      id: def.id,
      displayName: def.displayName,
      enabled,
      clientId: requireEnvString(env, `${def.envPrefix}CLIENT_ID`),
      authorizationEndpoint: requireEnvString(env, `${def.envPrefix}AUTH_ENDPOINT`),
      redirectUri: requireEnvString(env, `${def.envPrefix}REDIRECT_URI`),
      scope: env[`${def.envPrefix}SCOPE`]?.trim() || DEFAULT_SCOPE,
    });
  }

  return { providers };
}
