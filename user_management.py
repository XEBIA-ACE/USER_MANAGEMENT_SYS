```python
class RoleManager:
    def __init__(self):
        self.role_assignments = {}

    def assign_role(self, user, role):
        user.role = role
        self.role_assignments[user.username] = role

    def access_resource(self, user, resource):
        if resource == "sensitive_data" and "manage_users" in user.role.permissions:
            return True
        else:
            raise PermissionError(f"User {user.username} does not have access to {resource}.")

class User:
    def __init__(self, username, role=None):
        self.username = username
        self.role = role

class AdministratorRole:
    def __init__(self):
        self.permissions = [
            "manage_users",
            "view_logs",
        ]

    def perform_action(self, action):
        if action in self.permissions:
            return f"Action {action} performed by {self.username}"
        else:
            raise PermissionError(f"Unauthorized action: {action}")
```