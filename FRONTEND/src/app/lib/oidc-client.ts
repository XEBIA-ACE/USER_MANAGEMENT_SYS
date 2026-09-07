import type { IdpProvider } from "../types/oidc.types";

// Transient PKCE/state data lives in sessionStorage only; no session is
// created until the callback step (out of scope for US-001).
export const OIDC_STATE_KEY = "oidc_state";
export const OIDC_CODE_VERIFIER_KEY = "oidc_code_verifier";
export const OIDC_PROVIDER_KEY = "oidc_provider";

const CODE_VERIFIER_LENGTH = 64;
const STATE_LENGTH = 32;
const UNRESERVED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function randomUnreservedString(length: number): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += UNRESERVED[byte % UNRESERVED.length];
  return out;
}

export function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return randomUnreservedString(CODE_VERIFIER_LENGTH);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

export function generateState(): string {
  return randomUnreservedString(STATE_LENGTH);
}

export function buildAuthorizationUrl(
  provider: IdpProvider,
  codeChallenge: string,
  state: string
): URL {
  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", provider.redirectUri);
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url;
}

export function saveOidcParams(state: string, verifier: string, providerId?: string): void {
  sessionStorage.setItem(OIDC_STATE_KEY, state);
  sessionStorage.setItem(OIDC_CODE_VERIFIER_KEY, verifier);
  if (providerId) sessionStorage.setItem(OIDC_PROVIDER_KEY, providerId);
}

export function readOidcParams(): { state: string | null; verifier: string | null; providerId: string | null } {
  return {
    state: sessionStorage.getItem(OIDC_STATE_KEY),
    verifier: sessionStorage.getItem(OIDC_CODE_VERIFIER_KEY),
    providerId: sessionStorage.getItem(OIDC_PROVIDER_KEY),
  };
}

export function clearOidcParams(): void {
  sessionStorage.removeItem(OIDC_STATE_KEY);
  sessionStorage.removeItem(OIDC_CODE_VERIFIER_KEY);
  sessionStorage.removeItem(OIDC_PROVIDER_KEY);
}

/**
 * Generates PKCE + state, persists them for the callback, and sends the
 * browser to the IdP's authorization endpoint. Never creates a session.
 */
export async function initiateOidcRedirect(
  provider: IdpProvider,
  redirect: (url: string) => void = (url) => window.location.assign(url)
): Promise<URL> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();
  saveOidcParams(state, verifier, provider.id);
  const url = buildAuthorizationUrl(provider, challenge, state);
  redirect(url.toString());
  return url;
}
