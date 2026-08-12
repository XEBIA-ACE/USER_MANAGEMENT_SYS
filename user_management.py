```python
class UserManagementSystem:
    def __init__(self):
        self.users = {
            1: {'role': 'admin', 'permissions': []},
            2: {'role': 'user', 'permissions': []},
            3: {'role': 'user', 'permissions': []}
        }

    def get_user(self, role):
        for user_id, details in self.users.items():
            if details['role'] == role:
                return User(user_id, details['role'], self)

    def get_permissions(self, user_id):
        return self.users[user_id]['permissions']

class User:
    def __init__(self, user_id, role, system):
        self.user_id = user_id
        self.role = role
        self.system = system

    def modify_permissions(self, target_user_id, new_permissions):
        if self.role != 'admin':
            return False
        self.system.users[target_user_id]['permissions'] = new_permissions
        return True
```