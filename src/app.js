```javascript
const express = require('express');
const bodyParser = require('body-parser');
const passwordRecoveryController = require('./controllers/passwordRecoveryController');

const app = express();
app.use(bodyParser.json());

app.use('/api/password-recovery', passwordRecoveryController);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
```