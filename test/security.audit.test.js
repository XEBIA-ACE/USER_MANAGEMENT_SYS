```javascript
const { hasPermission } = require('../src/permissions');
const { logAdminActivity } = require('../src/logger');

describe('Security Audit for Administrator Role', () => {
    test('Admin has correct permissions', () => {
        expect(hasPermission('ADMIN', 'manageUsers')).toBe(true);
        expect(hasPermission('ADMIN', 'viewReports')).toBe(true);
        expect(hasPermission('ADMIN', 'configureSettings')).toBe(true);
        expect(hasPermission('ADMIN', 'editProfile')).toBe(false);
    });

    test('Logger records admin actions appropriately', () => {
        const spyLog = jest.spyOn(console, 'log');
        logAdminActivity('Added User', 'admin1');
        expect(spyLog).toHaveBeenCalledWith(expect.stringContaining('Admin Action: Added User by User: admin1'));
        spyLog.mockRestore();
    });
});
```

The above changes ensure that the Administrator role has proper logging and that its permissions adhere to the least-privilege principle for enhanced security and audit readiness.