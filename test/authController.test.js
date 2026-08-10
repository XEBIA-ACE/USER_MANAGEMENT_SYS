```javascript
const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const sendRecoveryEmail = require('../services/emailService');

jest.mock('../services/emailService');

describe('Password Recovery', () => {
    let email = 'test@example.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should send a recovery email for a valid user', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1, email });

        const response = await request(app)
            .post('/auth/recover-password')
            .send({ email });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Recovery email sent');
        expect(sendRecoveryEmail).toHaveBeenCalledWith(email, expect.any(String));
    });

    it('should return 404 for a non-existent user', async () => {
        jest.spyOn(User, 'findOne').mockResolvedValue(null);

        const response = await request(app)
            .post('/auth/recover-password')
            .send({ email: 'unknown@example.com' });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });
});
```