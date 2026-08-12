```java
package com.xebia.ums.model;

import javax.persistence.*;
import java.util.Set;

/**
 * Entity representing a Role in the system.
 */
@Entity
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @ElementCollection(fetch = FetchType.EAGER)
    private Set<String> permissions;

    // Constructors, getters, setters, equals, and hashCode methods

    public Role() {}

    public Role(String name, Set<String> permissions) {
        this.name = name;
        this.permissions = permissions;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<String> permissions) {
        this.permissions = permissions;
    }
}
```