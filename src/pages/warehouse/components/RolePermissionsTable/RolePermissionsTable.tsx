import React from 'react';
import { 
  WarehouseRole, 
  WarehousePermission, 
  RolePermissionMapping 
} from '@/types/warehouse';
import styles from './RolePermissionsTable.module.css';

interface RolePermissionsTableProps {
  roles: WarehouseRole[];
  permissions: WarehousePermission[];
  mappings: RolePermissionMapping[];
  onToggle: (roleId: string, permissionId: string) => void;
}

export const RolePermissionsTable: React.FC<RolePermissionsTableProps> = ({ 
  roles, 
  permissions, 
  mappings, 
  onToggle 
}) => {
  const categories = Array.from(new Set(permissions.map(p => p.category)));

  const isGranted = (roleId: string, permissionId: string) => {
    return mappings.find(m => m.roleId === roleId && m.permissionId === permissionId)?.granted || false;
  };

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.stickyCol}>Permission</th>
              {roles.map(role => (
                <th key={role.id} className={styles.roleHeader}>
                  <div className={styles.roleName}>{role.name}</div>
                  <div className={styles.roleSub}>{role.userCount} users</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <React.Fragment key={category}>
                <tr className={styles.categoryRow}>
                  <td colSpan={roles.length + 1}>{category}</td>
                </tr>
                {permissions.filter(p => p.category === category).map(permission => (
                  <tr key={permission.id}>
                    <td className={`${styles.stickyCol} ${styles.permCell}`}>
                      <div className={styles.permName}>{permission.name}</div>
                      <div className={styles.permDesc}>{permission.description}</div>
                    </td>
                    {roles.map(role => (
                      <td key={role.id} className={styles.checkboxCell}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={isGranted(role.id, permission.id)}
                            onChange={() => onToggle(role.id, permission.id)}
                            disabled={role.isSystemRole && role.name === 'Warehouse Manager'}
                          />
                          <span className={styles.checkmark} />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
