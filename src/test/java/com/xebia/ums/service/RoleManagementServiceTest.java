```java
package com.xebia.ums.service;

import com.xebia.ums.model.Role;
import com.xebia.ums.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RoleManagementServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private RoleManagementService roleManagementService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void updateAdministratorPermissions_shouldUpdatePermissions() {
        Role adminRole = new Role("Administrator", new HashSet<>(Set.of("READ", "WRITE")));
        when(roleRepository.findByName("Administrator")).thenReturn(adminRole);
        when(roleRepository.save(any(Role.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Set<String> newPermissions = Set.of("READ", "EXECUTE");
        Role updatedRole = roleManagementService.updateAdministratorPermissions(newPermissions);

        verify(roleRepository, times(1)).save(adminRole);
        assertEquals(newPermissions, updatedRole.getPermissions());
    }

    @Test
    void updateAdministratorPermissions_whenRoleNotFound_shouldThrowException() {
        when(roleRepository.findByName("Administrator")).thenReturn(null);

        Set<String> newPermissions = Set.of("READ", "EXECUTE");

        try {
            roleManagementService.updateAdministratorPermissions(newPermissions);
        } catch (IllegalArgumentException e) {
            assertEquals("Administrator role not found", e.getMessage());
        }

        verify(roleRepository, never()).save(any(Role.class));
    }
}
```