import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { Warehouse, Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, WarehouseRole } from '@/types';

export default function WarehousePlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role as WarehouseRole] : 'this role';
  return (
    <ModuleLayout moduleName="Warehouse" moduleIcon={Warehouse} navItems={[]}>
      <EmptyState
        icon={Construction}
        title="Content yet to be added"
        description={`Pages for ${roleLabel} in the Warehouse module are coming soon.`}
      />
    </ModuleLayout>
  );
}
