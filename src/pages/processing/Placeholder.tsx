import { Factory, Construction } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { EmptyState } from '@/components/common/EmptyState/EmptyState';
import { processingNav } from '@/config/processingNav';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/types';

export default function ProcessingPlaceholder() {
  const { user } = useAuth();
  const roleLabel = user ? ROLE_LABELS[user.role] : 'this role';

  return (
    <ModuleLayout moduleName="Processing" moduleIcon={Factory} navItems={processingNav}>
      <div style={{ padding: '40px 0' }}>
        <EmptyState
          icon={Construction}
          title="Content yet to be added"
          description={`Pages for ${roleLabel} in the Processing module are coming soon.`}
        />
      </div>
    </ModuleLayout>
  );
}
