"""
administrator_role.py
=====================
Administrator Role definition for the User_Management application.

This module is the authoritative source for:
  - The ADMINISTRATOR role constant
  - The full permission catalogue for administrative users
  - Helper utilities for permission checks

Design decisions are documented in docs/administrator_role_analysis.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import FrozenSet


# ---------------------------------------------------------------------------
# Permission catalogue
# Each permission follows the pattern  <resource>:<action>
# ---------------------------------------------------------------------------

class Permission(str, Enum):
    """Atomic permissions available in the User_Management application."""

    # -- User lifecycle management ------------------------------------------
    USERS_CREATE         = "users:create"
    USERS_READ           = "users:read"
    USERS_UPDATE         = "users:update"
    USERS_DELETE         = "users:delete"
    USERS_RESET_PASSWORD = "users:reset_password"
    USERS_UNLOCK         = "users:unlock"
    USERS_ASSIGN_ROLE    = "users:assign_role"
    USERS_REVOKE_ROLE    = "users:revoke_role"

    # -- Role & permission management ----------------------------------------
    ROLES_CREATE         = "roles:create"
    ROLES_READ           = "roles:read"
    ROLES_UPDATE         = "roles:update"
    ROLES_DELETE         = "roles:delete"
    PERMISSIONS_READ     = "permissions:read"

    # -- Audit & compliance --------------------------------------------------
    AUDIT_LOGS_READ      = "audit_logs:read"
    AUDIT_LOGS_EXPORT    = "audit_logs:export"
    LOGIN_HISTORY_READ   = "login_history:read"

    # -- System configuration ------------------------------------------------
    SYSTEM_CONFIG_READ   = "system_config:read"
    SYSTEM_CONFIG_UPDATE = "system_config:update"

    # -- API keys / tokens ---------------------------------------------------
    API_KEYS_CREATE      = "api_keys:create"
    API_KEYS_READ        = "api_keys:read"
    API_KEYS_REVOKE      = "api_keys:revoke"

    # -- Reporting & monitoring ----------------------------------------------
    REPORTS_READ         = "reports:read"
    REPORTS_GENERATE     = "reports:generate"


# ---------------------------------------------------------------------------
# Role names
# ---------------------------------------------------------------------------

class RoleName(str, Enum):
    """Named roles in the User_Management application."""

    REGULAR_USER  = "regular_user"
    ADMINISTRATOR = "administrator"
    # SUPER_ADMIN = "super_admin"  # TODO: define in a future story


# ---------------------------------------------------------------------------
# Permission sets per role
# ---------------------------------------------------------------------------

#: Permissions granted to a regular (non-privileged) user.
REGULAR_USER_PERMISSIONS: FrozenSet[Permission] = frozenset()

#: Full permission set granted to the Administrator role.
#: Follows the least-privilege principle — every permission is explicit.
#: See docs/administrator_role_analysis.md §3 for the full catalogue.
ADMINISTRATOR_PERMISSIONS: FrozenSet[Permission] = frozenset(
    [
        # User lifecycle
        Permission.USERS_CREATE,
        Permission.USERS_READ,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
        Permission.USERS_RESET_PASSWORD,
        Permission.USERS_UNLOCK,
        Permission.USERS_ASSIGN_ROLE,
        Permission.USERS_REVOKE_ROLE,
        # Role management
        Permission.ROLES_CREATE,
        Permission.ROLES_READ,
        Permission.ROLES_UPDATE,
        Permission.ROLES_DELETE,
        Permission.PERMISSIONS_READ,
        # Audit & compliance
        Permission.AUDIT_LOGS_READ,
        Permission.AUDIT_LOGS_EXPORT,
        Permission.LOGIN_HISTORY_READ,
        # System configuration
        Permission.SYSTEM_CONFIG_READ,
        Permission.SYSTEM_CONFIG_UPDATE,
        # API keys
        Permission.API_KEYS_CREATE,
        Permission.API_KEYS_READ,
        Permission.API_KEYS_REVOKE,
        # Reporting
        Permission.REPORTS_READ,
        Permission.REPORTS_GENERATE,
    ]
)

#: Maps each role name to its granted permissions.
ROLE_PERMISSIONS: dict[RoleName, FrozenSet[Permission]] = {
    RoleName.REGULAR_USER:  REGULAR_USER_PERMISSIONS,
    RoleName.ADMINISTRATOR: ADMINISTRATOR_PERMISSIONS,
}


# ---------------------------------------------------------------------------
# Role dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Role:
    """Immutable representation of a role and its permission set."""

    name: RoleName
    permissions: FrozenSet[Permission] = field(default_factory=frozenset)

    def has_permission(self, permission: Permission) -> bool:
        """Return True if this role grants *permission*."""
        return permission in self.permissions

    def __str__(self) -> str:  # pragma: no cover
        return self.name.value


# ---------------------------------------------------------------------------
# Pre-built role instances
# ---------------------------------------------------------------------------

ADMINISTRATOR_ROLE = Role(
    name=RoleName.ADMINISTRATOR,
    permissions=ADMINISTRATOR_PERMISSIONS,
)

REGULAR_USER_ROLE = Role(
    name=RoleName.REGULAR_USER,
    permissions=REGULAR_USER_PERMISSIONS,
)


# ---------------------------------------------------------------------------
# Privilege-escalation guard
# ---------------------------------------------------------------------------

#: Permissions that an Administrator is explicitly FORBIDDEN from granting
#: to themselves (self-escalation prevention).
#: See docs/administrator_role_analysis.md §4.3
SELF_ESCALATION_BLOCKED_PERMISSIONS: FrozenSet[Permission] = frozenset(
    [
        Permission.USERS_ASSIGN_ROLE,
        Permission.USERS_REVOKE_ROLE,
    ]
)


def can_assign_role(actor_id: str, target_user_id: str, role: RoleName) -> bool:
    """
    Guard: an Administrator may not modify their own role assignments.

    Args:
        actor_id:       ID of the Administrator performing the action.
        target_user_id: ID of the user whose roles are being changed.
        role:           The role being assigned or revoked.

    Returns:
        True if the assignment is permitted, False otherwise.

    TODO: Extend this function to check SuperAdmin boundary once that role
          is introduced (US-002 or similar).
    """
    if actor_id == target_user_id:
        # Self-escalation is never permitted
        return False
    # Future: block assignment of SUPER_ADMIN role by a plain Administrator
    return True
