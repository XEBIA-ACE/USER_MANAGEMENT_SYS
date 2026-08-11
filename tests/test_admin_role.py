```python
import unittest
from user_management import User, RoleManager, AdministratorRole

class TestAdministratorRole(unittest.TestCase):

    def setUp(self):
        self.role_manager = RoleManager()
        self.admin_user = User(username="admin", role=AdministratorRole())
        self.non_admin_user = User(username="user", role=None)
        self.role_manager.assign_role(self.admin_user, AdministratorRole())
    
    def test_admin_role_permissions(self):
        permissions = self.admin_user.role.permissions
        self.assertTrue("manage_users" in permissions)
        self.assertTrue("view_logs" in permissions)
        self.assertFalse("unauthorized_action" in permissions)

    def test_admin_access_control(self):
        # Simulate admin accessing restricted resource
        resource_access = self.role_manager.access_resource(self.admin_user, "sensitive_data")
        self.assertTrue(resource_access)

        # Simulate non-admin accessing restricted resource
        with self.assertRaises(PermissionError):
            self.role_manager.access_resource(self.non_admin_user, "sensitive_data")

    def test_logging_of_admin_actions(self):
        action_log = self.admin_user.role.perform_action("create_user")
        self.assertIn("create_user", action_log)
        self.assertIn(self.admin_user.username, action_log)
    
    def test_security_least_privilege(self):
        # Ensure least privilege principle is followed
        self.assertFalse("delete_logs" in self.admin_user.role.permissions)
        with self.assertRaises(PermissionError):
            self.admin_user.role.perform_action("delete_logs")

if __name__ == '__main__':
    unittest.main()
```