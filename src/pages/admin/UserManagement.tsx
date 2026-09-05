import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserCheck, UserX, Users as UsersIcon } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  createAdminUser,
  fetchAdminUsers,
  fetchBackendRoles,
  fetchOrganizations,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminUserRow,
  type BackendRoleInfo,
  type OrganizationRow,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * User administration — the platform's account register.
 *
 * Before this page existed the only way a user record could be created was
 * POST /auth/register (the public sign-up route) and there was no way at all
 * to see who had an account, change someone's role, or disable a leaver. The
 * endpoints behind it (server/src/modules/users/) write an audit_logs row in
 * the same transaction as every change, so anything done here shows up on
 * the Audit logs page immediately.
 *
 * Two guards are worth knowing about, both enforced server-side rather than
 * here: the last active Admin cannot be demoted or disabled, and nobody can
 * disable their own account.
 */
export default function UserManagement() {
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();

  const canCreate = usePermission('create_user');
  const canAssignRole = usePermission('assign_user_role');
  const canDeactivate = usePermission('deactivate_user');
  const canResetPassword = usePermission('reset_user_password');

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<BackendRoleInfo[]>([]);
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '', organizationId: '' });

  const load = useCallback(
    async (accessToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const [userRows, roleRows, orgRows] = await Promise.all([
          fetchAdminUsers(accessToken),
          fetchBackendRoles(accessToken),
          fetchOrganizations(accessToken),
        ]);
        setUsers(userRows);
        setRoles(roleRows);
        setOrgs(orgRows);
        if (roleRows.length > 0) setForm((f) => (f.role ? f : { ...f, role: roleRows[0].role }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load user accounts');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (token && canAdminister) void load(token);
  }, [token, canAdminister, load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (needle && !`${u.name} ${u.email} ${u.organization_name ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter]);

  const requiresOrg = useMemo(
    () => roles.find((r) => r.role === form.role)?.requiresOrganization ?? false,
    [roles, form.role],
  );

  async function handleCreate() {
    if (!token) return;
    if (!form.name.trim() || !form.email.trim()) {
      addToast('Name and email are both required.', 'warning');
      return;
    }
    if (form.password.length < 8) {
      addToast('Password must be at least 8 characters.', 'warning');
      return;
    }
    if (requiresOrg && !form.organizationId) {
      addToast(`The ${form.role} role must be linked to an organization.`, 'warning');
      return;
    }
    setPendingId('new');
    try {
      await createAdminUser(token, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        organizationId: form.organizationId || null,
      });
      addToast(`Account created for ${form.email.trim()}.`, 'success');
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: roles[0]?.role ?? '', organizationId: '' });
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to create the account', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleRoleChange(user: AdminUserRow, role: string) {
    if (!token || role === user.role) return;
    setPendingId(user.id);
    try {
      await updateAdminUser(token, user.id, { role });
      addToast(`${user.name} is now ${role}.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to change the role', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleToggleActive(user: AdminUserRow) {
    if (!token) return;
    setPendingId(user.id);
    try {
      await updateAdminUser(token, user.id, { isActive: !user.is_active });
      addToast(`${user.name} ${user.is_active ? 'disabled' : 're-enabled'}.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to change the account status', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleResetPassword(user: AdminUserRow) {
    if (!token) return;
    // Generated here rather than typed, so an admin never invents a weak one
    // and the value is shown exactly once for hand-off.
    const generated = `Sd-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;
    setPendingId(user.id);
    try {
      await resetAdminUserPassword(token, user.id, generated);
      addToast(`Temporary password for ${user.email}: ${generated}`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to reset the password', 'error');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>
              Every account on the platform, with the authorisation role it holds and the organization it acts for.
              Each change here writes an audit-trail entry in the same transaction.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
            </Button>
            {canCreate && canAdminister && (
              <Button leftIcon={Plus} onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? 'Cancel' : 'Add user'}
              </Button>
            )}
          </div>
        </div>

        {sessionError && (
          <div className={styles.card}>
            <span className={styles.errorText}>{sessionError}</span>
          </div>
        )}

        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <ShieldCheck size={16} />
            The account register is Admin-only on the server, so a read-only oversight session cannot list it.
          </div>
        )}

        {error && (
          <div className={styles.card}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}

        {showCreate && canAdminister && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>New account</h2>
            <p className={styles.sectionSubtitle}>
              The role decides what the account may do on the server. Breeder, Producer and Warehouse Manager act on
              behalf of an organization, so those must be linked to one.
            </p>
            <div className={styles.inlineForm}>
              <div className={styles.field}>
                <label className={styles.label}>Full name</label>
                <input
                  className={styles.textInput}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Asha Menon"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input
                  className={styles.textInput}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="asha@example.com"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Initial password</label>
                <input
                  className={styles.textInput}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <select
                  className={styles.select}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Organization{requiresOrg ? '' : ' (optional)'}</label>
                <select
                  className={styles.select}
                  value={form.organizationId}
                  onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                >
                  <option value="">— none —</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.actionRow}>
              <Button onClick={() => void handleCreate()} isLoading={pendingId === 'new'}>
                Create account
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filterBar}>
            <input
              className={styles.textInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email or organization…"
              style={{ maxWidth: 320 }}
            />
            <select className={styles.select} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.role}
                </option>
              ))}
            </select>
            <button
              className={`${styles.chip} ${statusFilter === 'all' ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`${styles.chip} ${statusFilter === 'active' ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`${styles.chip} ${statusFilter === 'inactive' ? styles.chipActive : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Disabled
            </button>
          </div>

          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>
              {canAdminister ? 'No accounts match these filters.' : 'Nothing to show for this role.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Organization</th>
                    <th>Status</th>
                    <th>Last activity</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr key={u.id} style={u.is_active ? undefined : { opacity: 0.65 }}>
                      <td>{u.name}</td>
                      <td className={styles.mono}>{u.email}</td>
                      <td>
                        {canAssignRole ? (
                          <select
                            className={styles.select}
                            value={u.role}
                            disabled={pendingId === u.id}
                            onChange={(e) => void handleRoleChange(u, e.target.value)}
                          >
                            {roles.map((r) => (
                              <option key={r.role} value={r.role}>
                                {r.role}
                              </option>
                            ))}
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td>{u.organization_name ?? <span className={styles.muted}>—</span>}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${u.is_active ? styles.badgeActive : styles.badgeInactive}`}
                        >
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        {u.last_action_at ? (
                          <>
                            {new Date(u.last_action_at).toLocaleDateString()}
                            <div className={styles.muted} style={{ fontSize: '0.72rem' }}>
                              {u.action_count} recorded action{u.action_count === 1 ? '' : 's'}
                            </div>
                          </>
                        ) : (
                          <span className={styles.muted}>never</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          {canResetPassword && (
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={KeyRound}
                              disabled={pendingId === u.id}
                              onClick={() => void handleResetPassword(u)}
                            >
                              Reset password
                            </Button>
                          )}
                          {canDeactivate && (
                            <Button
                              size="sm"
                              variant={u.is_active ? 'danger' : 'secondary'}
                              leftIcon={u.is_active ? UserX : UserCheck}
                              disabled={pendingId === u.id}
                              onClick={() => void handleToggleActive(u)}
                            >
                              {u.is_active ? 'Disable' : 'Enable'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {visible.length > 0 && (
            <p className={styles.sectionSubtitle} style={{ marginTop: '0.75rem' }}>
              <UsersIcon size={13} style={{ verticalAlign: '-2px' }} /> {visible.length} of {users.length} accounts
            </p>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
