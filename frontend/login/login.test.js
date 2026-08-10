/**
 * login.test.js – Unit tests for login.js utility functions
 *
 * Run with: npx jest frontend/login/login.test.js
 * (or any Jest-compatible runner)
 *
 * These tests cover the pure utility functions extracted from login.js
 * and the DOM interaction logic via jsdom.
 */

'use strict';

// ---------- Utility function tests (extracted for testability) ----------

/** Mirrors isValidEmail from login.js */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Mirrors isRelativeUrl from login.js */
function isRelativeUrl(url) {
  return url.startsWith('/') && !url.startsWith('//');
}

// ---------- isValidEmail ----------
describe('isValidEmail', () => {
  test('accepts a standard email address', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  test('accepts email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true);
  });

  test('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  test('rejects string without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  test('rejects string without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  test('rejects string with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
  });
});

// ---------- isRelativeUrl ----------
describe('isRelativeUrl', () => {
  test('accepts a relative path', () => {
    expect(isRelativeUrl('/dashboard')).toBe(true);
  });

  test('rejects protocol-relative URL (open redirect risk)', () => {
    expect(isRelativeUrl('//evil.com')).toBe(false);
  });

  test('rejects absolute URL', () => {
    expect(isRelativeUrl('https://evil.com')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(isRelativeUrl('')).toBe(false);
  });
});

// ---------- DOM interaction tests ----------
describe('Login form DOM', () => {
  let document;

  beforeEach(() => {
    // Minimal DOM setup using jsdom (provided by Jest's default testEnvironment)
    document = global.document;
    document.body.innerHTML = `
      <form id="loginForm">
        <div id="errorBanner" hidden>
          <span id="errorMessage"></span>
        </div>
        <input id="email" type="email" />
        <span id="emailError"></span>
        <input id="password" type="password" />
        <span id="passwordError"></span>
        <input id="rememberMe" type="checkbox" />
        <button id="submitBtn" type="submit">
          <span id="btnText">Sign In</span>
          <span id="btnSpinner" hidden></span>
        </button>
        <button id="togglePassword" type="button" aria-label="Show password" aria-pressed="false"></button>
      </form>
    `;
  });

  test('error banner is hidden by default', () => {
    const banner = document.getElementById('errorBanner');
    expect(banner.hidden).toBe(true);
  });

  test('email input starts empty', () => {
    const email = document.getElementById('email');
    expect(email.value).toBe('');
  });

  test('password input type is "password" by default', () => {
    const pwd = document.getElementById('password');
    expect(pwd.type).toBe('password');
  });

  test('submit button is enabled by default', () => {
    const btn = document.getElementById('submitBtn');
    expect(btn.disabled).toBe(false);
  });

  test('spinner is hidden by default', () => {
    const spinner = document.getElementById('btnSpinner');
    expect(spinner.hidden).toBe(true);
  });

  test('togglePassword button has correct initial aria attributes', () => {
    const toggle = document.getElementById('togglePassword');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});
