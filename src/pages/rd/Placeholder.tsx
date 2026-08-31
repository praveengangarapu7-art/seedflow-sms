import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { FlaskConical, Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, RDRole } from '@/types';

export default function RDPlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role as RDRole] : 'this role';
  return (
    <ModuleLayout moduleName="Research & Development" moduleIcon={FlaskConical} navItems={[]}>
      <EmptyState
        icon={Construction}
        title="Content yet to be added"
        description={`Pages for ${roleLabel} in the R&D module are coming soon.`}
      />
    </ModuleLayout>
  );
}
