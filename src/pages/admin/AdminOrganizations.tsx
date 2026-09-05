import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Plus, Power, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  createOrganization,
  fetchAdminUsers,
  fetchOrganizations,
  updateOrganization,
  type AdminUserRow,
  type OrganizationRow,
} from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * Organizations from the administrator's angle. The Master Data module
 * already has a full organization register with its own forms and detail
 * pages; this page deliberately does NOT duplicate that. What it adds is the
 * thing only an admin cares about: how many user accounts sit behind each
 * organization, and whether an organization can be switched off without
 * orphaning the people who log in through it.
 *
 * Anything deeper — addresses, certification detail, editing history — is one
 * click away in Master Data rather than reimplemented here.
 */
const ORG_TYPES = ['seed_company', 'research_institute', 'government', 'lab', 'distributor', 'cooperative'];

export default function AdminOrganizations() {
  const navigate = useNavigate();
  const { token, canAdminister, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const { addToast } = useToast();
  const canManage = usePermission('manage_admin_organizations');

  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: ORG_TYPES[0], location: '', contactPerson: '' });

  const load = useCallback(
    async (accessToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const orgRows = await fetchOrganizations(accessToken);
        setOrgs(orgRows);
        if (canAdminister) {
          try {
            setUsers(await fetchAdminUsers(accessToken));
          } catch {
            /* account counts are an enrichment, not the point of the page */
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load organizations');
      } finally {
        setBusy(false);
      }
    },
    [canAdminister],
  );

  useEffect(() => {
    if (token) void load(token);
  }, [token, load]);

  const accountsByOrg = useMemo(() => {
    const counts = new Map<string, { total: number; active: number }>();
    users.forEach((u) => {
      if (!u.organization_id) return;
      const entry = counts.get(u.organization_id) ?? { total: 0, active: 0 };
      entry.total += 1;
      if (u.is_active) entry.active += 1;
      counts.set(u.organization_id, entry);
    });
    return counts;
  }, [users]);

  const visible = useMemo(
    () => orgs.filter((o) => (typeFilter ? o.type === typeFilter : true)),
    [orgs, typeFilter],
  );

  const typesPresent = useMemo(() => Array.from(new Set(orgs.map((o) => o.type))).sort(), [orgs]);
  const activeCount = orgs.filter((o) => o.active !== false).length;

  async function handleCreate() {
    if (!token) return;
    if (!form.name.trim()) {
      addToast('An organization name is required.', 'warning');
      return;
    }
    setPendingId('new');
    try {
      await createOrganization(token, {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
      });
      addToast(`${form.name.trim()} added.`, 'success');
      setShowCreate(false);
      setForm({ name: '', type: ORG_TYPES[0], location: '', contactPerson: '' });
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to create the organization', 'error');
    } finally {
      setPendingId(null);
    }
  }

  async function handleToggleActive(org: OrganizationRow) {
    if (!token) return;
    const nextActive = org.active === false;
    const accounts = accountsByOrg.get(org.id);
    if (!nextActive && accounts && accounts.active > 0) {
      addToast(
        `${org.name} still has ${accounts.active} active account${accounts.active === 1 ? '' : 's'} — disable those first.`,
        'warning',
      );
      return;
    }
    setPendingId(org.id);
    try {
      await updateOrganization(token, org.id, { active: nextActive });
      addToast(`${org.name} ${nextActive ? 'reactivated' : 'deactivated'}.`, 'success');
      await load(token);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to change the organization', 'error');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Organizations</h1>
            <p className={styles.subtitle}>
              Every organization on the platform with the number of login accounts behind it. Full records — addresses,
              certifications, edit history — live in Master Data.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={RefreshCw} onClick={() => (token ? void load(token) : reload())}>
              Refresh
            </Button>
            <Button variant="secondary" leftIcon={ExternalLink} onClick={() => navigate('/organizations')}>
              Master Data register
            </Button>
            {canManage && canAdminister && (
              <Button leftIcon={Plus} onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? 'Cancel' : 'Add organization'}
              </Button>
            )}
          </div>
        </div>

        {sessionError && (
          <div className={styles.card}>
            <span className={styles.errorText}>{sessionError}</span>
          </div>
        )}
        {error && (
          <div className={styles.card}>
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
        {!sessionLoading && !canAdminister && (
          <div className={styles.readOnlyNotice}>
            <ShieldCheck size={16} />
            Read-only session: organizations are listed, account counts are withheld and nothing here can be changed.
          </div>
        )}

        <div className={styles.kpiGrid}>
          <KpiCard title="Organizations" value={String(orgs.length)} icon={Building2} />
          <KpiCard title="Active" value={String(activeCount)} icon={Power} />
          <KpiCard title="Types in use" value={String(typesPresent.length)} icon={Building2} />
          <KpiCard
            title="Linked accounts"
            value={users.length === 0 ? '—' : String(users.filter((u) => u.organization_id).length)}
            icon={ShieldCheck}
          />
        </div>

        {showCreate && canAdminister && (
          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>New organization</h2>
            <div className={styles.inlineForm}>
              <div className={styles.field}>
                <label className={styles.label}>Name</label>
                <input
                  className={styles.textInput}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Type</label>
                <select
                  className={styles.select}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Location</label>
                <input
                  className={styles.textInput}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Contact person</label>
                <input
                  className={styles.textInput}
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                />
              </div>
            </div>
            <div className={styles.actionRow}>
              <Button leftIcon={Save} onClick={() => void handleCreate()} isLoading={pendingId === 'new'}>
                Create
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.filterBar}>
            <button
              className={`${styles.chip} ${typeFilter === '' ? styles.chipActive : ''}`}
              onClick={() => setTypeFilter('')}
            >
              All types
            </button>
            {typesPresent.map((t) => (
              <button
                key={t}
                className={`${styles.chip} ${typeFilter === t ? styles.chipActive : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>No organizations match this filter.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Accounts</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((org) => {
                    const accounts = accountsByOrg.get(org.id);
                    const isActive = org.active !== false;
                    return (
                      <tr key={org.id} style={isActive ? undefined : { opacity: 0.65 }}>
                        <td>
                          <button className={styles.rowButton} onClick={() => navigate(`/organizations/${org.id}`)}>
                            {org.name}
                          </button>
                        </td>
                        <td>{(org.type ?? '').replace(/_/g, ' ')}</td>
                        <td>{org.location || <span className={styles.muted}>—</span>}</td>
                        <td>
                          {accounts ? (
                            <>
                              {accounts.total}
                              {accounts.active !== accounts.total && (
                                <span className={styles.muted}> ({accounts.active} active)</span>
                              )}
                            </>
                          ) : (
                            <span className={styles.muted}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            {canManage && canAdminister && (
                              <Button
                                size="sm"
                                variant={isActive ? 'danger' : 'secondary'}
                                leftIcon={Power}
                                disabled={pendingId === org.id}
                                onClick={() => void handleToggleActive(org)}
                              >
                                {isActive ? 'Deactivate' : 'Reactivate'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModuleLayout>
  );
}
