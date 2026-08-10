```javascript
const express = require('express');
const { requestPasswordRecovery } = require('./src/controllers/authController');

const app = express();
app.use(express.json());

app.post('/auth/recover-password', requestPasswordRecovery);

module.exports = app;
```