import { useAuth } from '@/context/AuthContext';
import { hasPermission, type Permission } from '@/utils/permissions';

export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return user ? hasPermission(user.role, permission) : false;
}
