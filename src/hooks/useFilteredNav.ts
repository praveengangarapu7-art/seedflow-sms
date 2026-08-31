import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/utils/permissions';
import type { ProcurementNavItem } from '@/config/procurementNav';

export function useFilteredNav(navItems: ProcurementNavItem[]) {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user) return [];
    return navItems.filter(item => {
      if (!item.permission) return true;
      return hasPermission(user.role, item.permission);
    });
  }, [navItems, user]);
}
