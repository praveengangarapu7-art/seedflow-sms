import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { FlaskConical, Construction } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, type LabRole } from '@/types';

export default function LabPlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role as LabRole] : 'this role';
  return (
    <ModuleLayout moduleName="Laboratory" moduleIcon={FlaskConical} navItems={[]}>
      <EmptyState
        icon={Construction}
        title="No laboratory pages for this role"
        description={`Pages for ${roleLabel} in the Laboratory module are not available yet.`}
      />
    </ModuleLayout>
  );
}
