```python
import unittest
from user_management.roles.administrator_role import AdministratorRole


class TestAdministratorRole(unittest.TestCase):
    
    def setUp(self):
        self.admin_role = AdministratorRole(user_id="admin123")
    
    def test_permissions(self):
        expected_permissions = [
            "view_users",
            "add_user",
            "edit_user",
            "delete_user",
            "manage_roles",
            "view_logs"
        ]
        self.assertEqual(self.admin_role.permissions, expected_permissions, "Permissions do not match expected set.")

    def test_action_performance(self):
        try:
            self.admin_role.perform_action("add_user")
        except PermissionError as e:
            self.fail(f"perform_action raised PermissionError unexpectedly: {e}")

    def test_action_denied(self):
        with self.assertRaises(PermissionError):
            self.admin_role.perform_action("unauthorized_action")

    def test_action_logging(self):
        self.admin_role.perform_action("view_users")
        self.assertIn("admin123 performed view_users", self.admin_role.audit_logs, "Action was not logged properly.")


if __name__ == "__main__":
    unittest.main()
```