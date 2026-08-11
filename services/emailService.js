/**
 * emailService.js
 *
 * Handles all outbound email operations for the User Management System.
 * Uses Nodemailer with SMTP transport (configurable via environment variables).
 *
 * Acceptance criteria addressed:
 *  - Confirmation emails are sent to the user upon successful registration.
 *  - Email content is correctly formatted and contains all necessary information.
 *  - Email delivery is reliable, with minimal latency (async/await, connection pooling).
 */

'use strict';

const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transport configuration
// All sensitive values are read from environment variables so that no
// credentials are hard-coded in source control.
// ---------------------------------------------------------------------------
const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false otherwise
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    // Connection pooling reduces per-message latency
    pool: true,
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5', 10),
    maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100', 10),
  });

// Lazily initialised singleton transport
let _transport = null;
const getTransport = () => {
  if (!_transport) {
    _transport = createTransport();
  }
  return _transport;
};

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

/**
 * Builds the plain-text body for a registration confirmation email.
 * @param {Object} user - { name, email }
 * @returns {string}
 */
const buildConfirmationTextBody = (user) => `
Hello ${user.name},

Thank you for registering with us!

Your account has been successfully created with the following details:
  - Name  : ${user.name}
  - Email : ${user.email}

If you did not create this account, please contact our support team immediately.

Best regards,
The UMS Team
`.trim();

/**
 * Builds the HTML body for a registration confirmation email.
 * @param {Object} user - { name, email }
 * @returns {string}
 */
const buildConfirmationHtmlBody = (user) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px;
                 padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333333; font-size: 24px; }
    p  { color: #555555; line-height: 1.6; }
    .details { background: #f9f9f9; border-left: 4px solid #4CAF50; padding: 12px 16px;
               border-radius: 4px; margin: 16px 0; }
    .details p { margin: 4px 0; }
    .footer { margin-top: 32px; font-size: 12px; color: #aaaaaa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome, ${escapeHtml(user.name)}!</h1>
    <p>Thank you for registering. Your account has been successfully created.</p>
    <div class="details">
      <p><strong>Name:</strong>  ${escapeHtml(user.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
    </div>
    <p>If you did not create this account, please contact our support team immediately.</p>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} UMS Team. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`.trim();

/**
 * Minimal HTML escaping to prevent XSS in email bodies.
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends a registration confirmation email to the newly registered user.
 *
 * @param {Object} user          - The registered user object.
 * @param {string} user.name     - Full name of the user.
 * @param {string} user.email    - Email address of the user.
 * @returns {Promise<Object>}    - Nodemailer send result (messageId, etc.).
 * @throws {Error}               - Rethrows transport errors for the caller to handle.
 */
const sendRegistrationConfirmation = async (user) => {
  if (!user || !user.email) {
    throw new Error('emailService.sendRegistrationConfirmation: user.email is required');
  }
  if (!user.name) {
    throw new Error('emailService.sendRegistrationConfirmation: user.name is required');
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'UMS Team'}" <${process.env.EMAIL_FROM_ADDRESS || 'no-reply@ums.example.com'}>`,
    to: user.email,
    subject: 'Welcome to UMS – Registration Confirmation',
    text: buildConfirmationTextBody(user),
    html: buildConfirmationHtmlBody(user),
  };

  const transport = getTransport();
  const result = await transport.sendMail(mailOptions);
  return result;
};

/**
 * Verifies the SMTP connection. Useful for health-check endpoints.
 * @returns {Promise<boolean>}
 */
const verifyConnection = async () => {
  const transport = getTransport();
  await transport.verify();
  return true;
};

/**
 * Closes the transport connection pool gracefully.
 * Call this during application shutdown.
 */
const closeTransport = () => {
  if (_transport) {
    _transport.close();
    _transport = null;
  }
};

module.exports = {
  sendRegistrationConfirmation,
  verifyConnection,
  closeTransport,
  // Exported for unit-testing purposes
  _buildConfirmationTextBody: buildConfirmationTextBody,
  _buildConfirmationHtmlBody: buildConfirmationHtmlBody,
};
