import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { ShoppingCart, Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ProcurementRole } from '@/types';

export default function ProcurementPlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role as ProcurementRole] : 'this role';
  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={[]}>
      <EmptyState
        icon={Construction}
        title="Content yet to be added"
        description={`Pages for ${roleLabel} in the Procurement module are coming soon.`}
      />
    </ModuleLayout>
  );
}
