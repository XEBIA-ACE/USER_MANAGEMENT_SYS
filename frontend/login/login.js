/**
 * login.js – Client-side logic for the Login Interface
 *
 * Responsibilities:
 *  1. Client-side form validation (email format, password presence)
 *  2. Submit handler: calls the login API endpoint, handles loading state
 *  3. Password visibility toggle
 *  4. "Remember me" persistence (stores email in localStorage)
 *  5. Accessible error messaging via ARIA live regions
 *
 * NOTE: The actual credential validation happens server-side.
 * This file only handles UI behaviour and the API call.
 *
 * API contract (adjust BASE_URL to match your backend):
 *   POST /api/auth/login
 *   Body:  { email: string, password: string, rememberMe: boolean }
 *   200:   { token: string, user: { id, email, name } }
 *   401:   { message: string }
 *   422:   { errors: { field: string, message: string }[] }
 */

'use strict';

// ---------- Configuration ----------
const API_BASE_URL = '/api';          // TODO: update to match deployment environment
const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
const REDIRECT_AFTER_LOGIN = '/dashboard.html';
const REMEMBER_ME_KEY = 'ums_remembered_email';

// ---------- DOM References ----------
const form          = document.getElementById('loginForm');
const emailInput    = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMe    = document.getElementById('rememberMe');
const submitBtn     = document.getElementById('submitBtn');
const btnText       = document.getElementById('btnText');
const btnSpinner    = document.getElementById('btnSpinner');
const errorBanner   = document.getElementById('errorBanner');
const errorMessage  = document.getElementById('errorMessage');
const emailError    = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePwdBtn  = document.getElementById('togglePassword');

// ---------- Initialisation ----------
(function init() {
  // Restore remembered email
  const savedEmail = localStorage.getItem(REMEMBER_ME_KEY);
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberMe.checked = true;
  }

  // Attach event listeners
  form.addEventListener('submit', handleSubmit);
  togglePwdBtn.addEventListener('click', togglePasswordVisibility);

  // Clear field errors on input
  emailInput.addEventListener('input', () => clearFieldError(emailInput, emailError));
  passwordInput.addEventListener('input', () => clearFieldError(passwordInput, passwordError));
})();

// ---------- Form Submit Handler ----------
async function handleSubmit(event) {
  event.preventDefault();

  // Reset previous errors
  hideErrorBanner();
  clearFieldError(emailInput, emailError);
  clearFieldError(passwordInput, passwordError);

  // Client-side validation
  const isValid = validateForm();
  if (!isValid) return;

  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  const remember = rememberMe.checked;

  // Persist or clear remembered email
  if (remember) {
    localStorage.setItem(REMEMBER_ME_KEY, email);
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }

  setLoadingState(true);

  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password, rememberMe: remember }),
      credentials: 'same-origin',   // include cookies for session-based auth
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      handleLoginSuccess(data);
    } else if (response.status === 401) {
      showErrorBanner(data.message || 'Invalid email or password. Please try again.');
    } else if (response.status === 422 && Array.isArray(data.errors)) {
      handleValidationErrors(data.errors);
    } else {
      showErrorBanner('An unexpected error occurred. Please try again later.');
    }
  } catch (networkError) {
    // Network failure or server unreachable
    showErrorBanner('Unable to connect. Please check your internet connection and try again.');
    console.error('[Login] Network error:', networkError);
  } finally {
    setLoadingState(false);
  }
}

// ---------- Success Handler ----------
function handleLoginSuccess(data) {
  // Store token if using JWT (token-based auth)
  if (data.token) {
    // Use sessionStorage for non-persistent sessions; localStorage for persistent
    const storage = rememberMe.checked ? localStorage : sessionStorage;
    storage.setItem('ums_auth_token', data.token);
  }

  // Redirect to dashboard (or a return URL if provided in query string)
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('returnUrl');
  const destination = returnUrl && isRelativeUrl(returnUrl)
    ? returnUrl
    : REDIRECT_AFTER_LOGIN;

  window.location.href = destination;
}

// ---------- Validation ----------
function validateForm() {
  let valid = true;

  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    showFieldError(emailInput, emailError, 'Email address is required.');
    valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError(emailInput, emailError, 'Please enter a valid email address.');
    valid = false;
  }

  if (!password) {
    showFieldError(passwordInput, passwordError, 'Password is required.');
    valid = false;
  } else if (password.length < 6) {
    // Minimal client-side length check; real validation is server-side
    showFieldError(passwordInput, passwordError, 'Password must be at least 6 characters.');
    valid = false;
  }

  return valid;
}

function handleValidationErrors(errors) {
  errors.forEach(({ field, message }) => {
    if (field === 'email') {
      showFieldError(emailInput, emailError, message);
    } else if (field === 'password') {
      showFieldError(passwordInput, passwordError, message);
    }
  });
}

// ---------- UI Helpers ----------
function setLoadingState(loading) {
  submitBtn.disabled = loading;
  btnText.textContent = loading ? 'Signing in…' : 'Sign In';
  btnSpinner.hidden = !loading;
  btnSpinner.setAttribute('aria-hidden', String(!loading));
}

function showErrorBanner(message) {
  errorMessage.textContent = message;
  errorBanner.hidden = false;
  // Scroll banner into view on small screens
  errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideErrorBanner() {
  errorBanner.hidden = true;
  errorMessage.textContent = '';
}

function showFieldError(input, errorEl, message) {
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
}

function clearFieldError(input, errorEl) {
  input.classList.remove('is-invalid');
  input.removeAttribute('aria-invalid');
  errorEl.textContent = '';
}

// ---------- Password Visibility Toggle ----------
function togglePasswordVisibility() {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePwdBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
  togglePwdBtn.setAttribute('aria-pressed', String(isPassword));
}

// ---------- Utility ----------
function isValidEmail(value) {
  // RFC 5322-inspired lightweight check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRelativeUrl(url) {
  // Prevent open-redirect: only allow relative paths
  return url.startsWith('/') && !url.startsWith('//');
}
