```javascript
const nodemailer = require('nodemailer');

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Function to send recovery email
const sendRecoveryEmail = async (email, token) => {
    const resetUrl = `https://example.com/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Recovery Instructions',
        text: `You requested a password recovery. Click the link to reset your password: ${resetUrl}`,
        html: `<p>You requested a password recovery. Click the link to reset your password: <a href="${resetUrl}">Reset Password</a></p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Recovery email sent to ${email}`);
    } catch (error) {
        console.error(`Failed to send recovery email to ${email}:`, error);
        // Handle error appropriately, log it or notify admin
    }
};

module.exports = sendRecoveryEmail;
```