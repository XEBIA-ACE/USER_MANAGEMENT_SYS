```javascript
const express = require('express');
const crypto = require('crypto');
const { sendRecoveryEmail } = require('../services/emailService');
const { storeToken, verifyToken, updatePassword } = require('../services/passwordRecoveryService');

const router = express.Router();

// Endpoint to initiate password recovery process
router.post('/request-recovery', async (req, res) => {
    const { email } = req.body;

    try {
        const token = crypto.randomBytes(32).toString('hex');
        await storeToken(email, token);
        
        await sendRecoveryEmail(email, token);
        
        res.status(200).json({ message: 'Recovery email sent.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to reset password using token
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const email = await verifyToken(token);

        if (email) {
            await updatePassword(email, newPassword);
            res.status(200).json({ message: 'Password updated successfully.' });
        } else {
            res.status(400).json({ error: 'Invalid or expired token.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
```