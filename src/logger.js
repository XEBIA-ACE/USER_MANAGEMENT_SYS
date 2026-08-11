```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'admin-activity.log' })
    ]
});

// Function to log admin activity
function logAdminActivity(action, adminUser) {
    logger.info(`Admin Action: ${action} by User: ${adminUser}`);
}

module.exports = { logAdminActivity };
```

### 2. Enforce Least-Privilege Principle
Verify that our permissions setup aligns with the least-privilege principle. Adjust if needed.