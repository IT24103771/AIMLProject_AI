package com.example.demo.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class RoleService {

    @Autowired
    private RoleRepository roleRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role createRole(Role role) {
        if (roleRepository.existsByRoleName(role.getRoleName())) {
            throw new IllegalArgumentException("A role with this name already exists.");
        }
        if ("ADMIN".equalsIgnoreCase(role.getRoleType())) {
            throw new IllegalArgumentException("Cannot create roles with ADMIN type. Use STAFF or SUB_ADMIN.");
        }
        role.setLastModified(LocalDateTime.now());
        return roleRepository.save(role);
    }

    public Optional<Role> updateRole(Long id, Role roleDetails) {
        return roleRepository.findById(id).map(existing -> {
            existing.setRoleName(roleDetails.getRoleName());
            existing.setRoleType(roleDetails.getRoleType());
            existing.setDescription(roleDetails.getDescription());
            existing.setInventoryTracking(roleDetails.isInventoryTracking());
            existing.setProductManagement(roleDetails.isProductManagement());
            existing.setSalesManagement(roleDetails.isSalesManagement());
            existing.setDiscountsAlerts(roleDetails.isDiscountsAlerts());
            existing.setReportAnalytics(roleDetails.isReportAnalytics());
            existing.setUserControl(roleDetails.isUserControl());
            existing.setAddUpdateStock(roleDetails.isAddUpdateStock());
            existing.setLastModified(LocalDateTime.now());
            return roleRepository.save(existing);
        });
    }

    public boolean deleteRole(Long id) {
        if (roleRepository.existsById(id)) {
            roleRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
