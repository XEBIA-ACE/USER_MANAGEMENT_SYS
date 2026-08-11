/**
 * emailService.test.js
 *
 * Unit tests for emailService.js – covers all acceptance criteria:
 *  1. Confirmation emails are sent upon successful registration.
 *  2. Email content is correctly formatted and contains all necessary information.
 *  3. Reliable delivery path (error propagation, input validation).
 */

'use strict';

// Mock nodemailer before requiring the service
jest.mock('nodemailer', () => {
  const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'test-message-id-123' });
  const verifyMock   = jest.fn().mockResolvedValue(true);
  const closeMock    = jest.fn();

  return {
    createTransport: jest.fn(() => ({
      sendMail: sendMailMock,
      verify:   verifyMock,
      close:    closeMock,
    })),
    // Expose mocks for assertions
    __mocks: { sendMailMock, verifyMock, closeMock },
  };
});

const nodemailer = require('nodemailer');
const {
  sendRegistrationConfirmation,
  verifyConnection,
  closeTransport,
  _buildConfirmationTextBody,
  _buildConfirmationHtmlBody,
} = require('./emailService');

// Reset the lazy-singleton transport between tests
beforeEach(() => {
  jest.clearAllMocks();
  // Force re-creation of the transport singleton
  closeTransport();
});

// ---------------------------------------------------------------------------
// sendRegistrationConfirmation
// ---------------------------------------------------------------------------
describe('sendRegistrationConfirmation', () => {
  const validUser = { name: 'Jane Doe', email: 'jane.doe@example.com' };

  test('calls sendMail with correct recipient', async () => {
    const result = await sendRegistrationConfirmation(validUser);
    const { sendMailMock } = nodemailer.__mocks;

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.to).toBe(validUser.email);
  });

  test('email subject contains "Registration Confirmation"', async () => {
    await sendRegistrationConfirmation(validUser);
    const { sendMailMock } = nodemailer.__mocks;
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.subject).toMatch(/Registration Confirmation/i);
  });

  test('email text body contains user name and email', async () => {
    await sendRegistrationConfirmation(validUser);
    const { sendMailMock } = nodemailer.__mocks;
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.text).toContain(validUser.name);
    expect(mailOptions.text).toContain(validUser.email);
  });

  test('email HTML body contains user name and email', async () => {
    await sendRegistrationConfirmation(validUser);
    const { sendMailMock } = nodemailer.__mocks;
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.html).toContain(validUser.name);
    expect(mailOptions.html).toContain(validUser.email);
  });

  test('email has both text and html parts (multipart)', async () => {
    await sendRegistrationConfirmation(validUser);
    const { sendMailMock } = nodemailer.__mocks;
    const mailOptions = sendMailMock.mock.calls[0][0];
    expect(mailOptions.text).toBeTruthy();
    expect(mailOptions.html).toBeTruthy();
  });

  test('returns the sendMail result (messageId)', async () => {
    const result = await sendRegistrationConfirmation(validUser);
    expect(result).toEqual({ messageId: 'test-message-id-123' });
  });

  test('throws when user.email is missing', async () => {
    await expect(sendRegistrationConfirmation({ name: 'No Email' }))
      .rejects.toThrow(/user\.email is required/);
  });

  test('throws when user.name is missing', async () => {
    await expect(sendRegistrationConfirmation({ email: 'no-name@example.com' }))
      .rejects.toThrow(/user\.name is required/);
  });

  test('throws when user object is null', async () => {
    await expect(sendRegistrationConfirmation(null))
      .rejects.toThrow();
  });

  test('propagates transport errors to the caller', async () => {
    const { sendMailMock } = nodemailer.__mocks;
    sendMailMock.mockRejectedValueOnce(new Error('SMTP connection refused'));

    await expect(sendRegistrationConfirmation(validUser))
      .rejects.toThrow('SMTP connection refused');
  });
});

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------
describe('_buildConfirmationTextBody', () => {
  const user = { name: 'John Smith', email: 'john@example.com' };

  test('contains greeting with user name', () => {
    const body = _buildConfirmationTextBody(user);
    expect(body).toContain(`Hello ${user.name}`);
  });

  test('contains user email', () => {
    const body = _buildConfirmationTextBody(user);
    expect(body).toContain(user.email);
  });

  test('mentions successful registration', () => {
    const body = _buildConfirmationTextBody(user);
    expect(body).toMatch(/successfully created|registration/i);
  });
});

describe('_buildConfirmationHtmlBody', () => {
  const user = { name: 'Alice <script>', email: 'alice@example.com' };

  test('escapes HTML special characters in user name', () => {
    const html = _buildConfirmationHtmlBody(user);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('contains user email', () => {
    const html = _buildConfirmationHtmlBody(user);
    expect(html).toContain(user.email);
  });

  test('is valid HTML structure (has html/body tags)', () => {
    const html = _buildConfirmationHtmlBody({ name: 'Test', email: 'test@test.com' });
    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain('</html>');
  });
});

// ---------------------------------------------------------------------------
// verifyConnection
// ---------------------------------------------------------------------------
describe('verifyConnection', () => {
  test('returns true when transport verify succeeds', async () => {
    const result = await verifyConnection();
    expect(result).toBe(true);
  });

  test('propagates error when transport verify fails', async () => {
    const { verifyMock } = nodemailer.__mocks;
    verifyMock.mockRejectedValueOnce(new Error('Auth failed'));
    await expect(verifyConnection()).rejects.toThrow('Auth failed');
  });
});
