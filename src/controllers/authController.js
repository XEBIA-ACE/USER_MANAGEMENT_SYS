```javascript
const sendRecoveryEmail = require('../services/emailService');
const { generateRecoveryToken } = require('../utils/token');
const User = require('../models/user');

// Controller to handle password recovery request
const requestPasswordRecovery = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = generateRecoveryToken(user);
        await sendRecoveryEmail(email, token);

        res.status(200).json({ message: 'Recovery email sent' });
    } catch (error) {
        console.error('Error during password recovery request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { requestPasswordRecovery };
```