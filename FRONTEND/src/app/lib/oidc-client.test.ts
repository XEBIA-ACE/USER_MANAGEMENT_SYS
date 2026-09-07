import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  OIDC_CODE_VERIFIER_KEY,
  OIDC_PROVIDER_KEY,
  OIDC_STATE_KEY,
  base64UrlEncode,
  buildAuthorizationUrl,
  clearOidcParams,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  initiateOidcRedirect,
  readOidcParams,
  saveOidcParams,
} from "./oidc-client";
import type { IdpProvider } from "../types/oidc.types";

const UNRESERVED_RE = /^[A-Za-z0-9\-._~]+$/;

const okta: IdpProvider = {
  id: "okta",
  displayName: "Okta",
  authorizationEndpoint: "https://okta.example.test/oauth2/v1/authorize",
  clientId: "okta-client",
  redirectUri: "https://app.example.test/auth/callback",
  scope: "openid profile email",
};

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("generateCodeVerifier", () => {
  test("is 43-128 chars of unreserved characters and unique per call", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a.length).toBeLessThanOrEqual(128);
    expect(a).toMatch(UNRESERVED_RE);
    expect(a).not.toBe(b);
  });
});

describe("generateCodeChallenge", () => {
  test("matches the RFC 7636 Appendix B reference vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    await expect(generateCodeChallenge(verifier)).resolves.toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });

  test("output is base64url without padding", async () => {
    const challenge = await generateCodeChallenge(generateCodeVerifier());
    expect(challenge).toHaveLength(43);
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe("base64UrlEncode", () => {
  test("uses - and _ and strips padding", () => {
    expect(base64UrlEncode(new Uint8Array([0xfb, 0xff]))).toBe("-_8");
  });
});

describe("generateState", () => {
  test("is a non-empty unreserved string and unique per call", () => {
    const a = generateState();
    expect(a.length).toBeGreaterThanOrEqual(16);
    expect(a).toMatch(UNRESERVED_RE);
    expect(a).not.toBe(generateState());
  });
});

describe("buildAuthorizationUrl", () => {
  test("includes every required OIDC/PKCE query parameter", () => {
    const url = buildAuthorizationUrl(okta, "challenge-123", "state-abc");

    expect(url.origin + url.pathname).toBe("https://okta.example.test/oauth2/v1/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("okta-client");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.example.test/auth/callback");
    expect(url.searchParams.get("scope")).toBe("openid profile email");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe("state-abc");
  });

  test("preserves existing query params on the endpoint", () => {
    const url = buildAuthorizationUrl(
      { ...okta, authorizationEndpoint: "https://idp.example.test/authorize?tenant=t1" },
      "c",
      "s"
    );
    expect(url.searchParams.get("tenant")).toBe("t1");
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});

describe("saveOidcParams / readOidcParams / clearOidcParams", () => {
  test("round-trips through sessionStorage only", () => {
    saveOidcParams("state-1", "verifier-1", "okta");

    expect(sessionStorage.getItem(OIDC_STATE_KEY)).toBe("state-1");
    expect(sessionStorage.getItem(OIDC_CODE_VERIFIER_KEY)).toBe("verifier-1");
    expect(sessionStorage.getItem(OIDC_PROVIDER_KEY)).toBe("okta");
    expect(readOidcParams()).toEqual({ state: "state-1", verifier: "verifier-1", providerId: "okta" });
    expect(localStorage.length).toBe(0);

    clearOidcParams();
    expect(readOidcParams()).toEqual({ state: null, verifier: null, providerId: null });
  });
});

describe("initiateOidcRedirect", () => {
  test("stores PKCE params, redirects to the IdP, and creates no session", async () => {
    const redirect = vi.fn();

    const url = await initiateOidcRedirect(okta, redirect);

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(url.toString());
    expect(url.origin + url.pathname).toBe(okta.authorizationEndpoint);

    const { state, verifier, providerId } = readOidcParams();
    expect(state).toBe(url.searchParams.get("state"));
    expect(providerId).toBe("okta");
    expect(verifier).not.toBeNull();
    await expect(generateCodeChallenge(verifier as string)).resolves.toBe(
      url.searchParams.get("code_challenge")
    );

    // FR-07: no session material is written anywhere but sessionStorage.
    expect(localStorage.getItem("ums_session_token")).toBeNull();
  });
});
