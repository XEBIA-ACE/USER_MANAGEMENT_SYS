```javascript
const Permissions = {
    ADMIN: ['manageUsers', 'viewReports', 'configureSettings'],
    USER: ['viewProfile', 'editProfile']
};

// Verifying the least-privilege principle
// Function to check if a user has permission for an action
function hasPermission(userRole, action) {
    return Permissions[userRole].includes(action);
}

module.exports = { Permissions, hasPermission };
```

### 3. Conduct Final Security Audit
Update tests to ensure compliance with security practices.