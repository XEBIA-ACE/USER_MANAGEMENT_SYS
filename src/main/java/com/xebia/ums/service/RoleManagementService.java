```java
package com.xebia.ums.service;

import com.xebia.ums.model.Role;
import com.xebia.ums.repository.RoleRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service class to manage roles and their permissions.
 */
@Service
public class RoleManagementService {

    @Autowired
    private RoleRepository roleRepository;

    /**
     * Update the permissions of the Administrator role.
     *
     * @param newPermissions the new set of permissions to be applied
     * @return the updated Role object
     */
    @Transactional
    public Role updateAdministratorPermissions(Set<String> newPermissions) {
        Role adminRole = roleRepository.findByName("Administrator");
        if (adminRole != null) {
            adminRole.setPermissions(newPermissions);
            return roleRepository.save(adminRole);
        }
        throw new IllegalArgumentException("Administrator role not found");
    }
}
```