import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { AccountNav } from '@/components/layout/AccountNav/AccountNav';
import { Input } from '@/components/common/Input/Input';
import { Button } from '@/components/common/Button/Button';
import { Badge } from '@/components/common/Badge/Badge';
import { useToast } from '@/components/common/Toast/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types';
import styles from './Account.module.css';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [organizationName, setOrganizationName] = useState(user?.organizationName ?? '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const dirty =
    name !== user.name ||
    email !== user.email ||
    organizationName !== (user.organizationName ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    updateUser({
      name: name.trim() || user!.name,
      email: email.trim() || user!.email,
      organizationName: organizationName.trim() || undefined,
    });
    setSaving(false);
    addToast('Profile updated', 'success');
  }

  function handleReset() {
    setName(user!.name);
    setEmail(user!.email);
    setOrganizationName(user!.organizationName ?? '');
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Profile</h1>
        <p className={styles.subtitle}>Manage the name, email and organization shown across SeedSphere.</p>
      </div>

      <AccountNav />

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles.identityCard}`}>
          <div className={styles.avatar}>{getInitials(user.name)}</div>
          <p className={styles.identityName}>{user.name}</p>
          <p className={styles.identityEmail}>{user.email}</p>
          <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
          <p className={styles.roleDescription}>{ROLE_DESCRIPTIONS[user.role]}</p>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Personal information</h2>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <Input
                label="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Input
              label="Organization"
              placeholder="e.g. SeedSphere Cooperative"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              helperText="Shown on partner portals and shared documents."
            />
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={handleReset} disabled={!dirty}>
                Discard changes
              </Button>
              <Button type="submit" variant="primary" leftIcon={Save} isLoading={saving} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
