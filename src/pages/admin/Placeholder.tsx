import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { ShieldCheck, Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, type AdminRole } from '@/types';

export default function AdminPlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role as AdminRole] : 'this role';
  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={[]}>
      <EmptyState
        icon={Construction}
        title="No administration pages for this role"
        description={`Pages for ${roleLabel} in the Administration module are not available yet.`}
      />
    </ModuleLayout>
  );
}
