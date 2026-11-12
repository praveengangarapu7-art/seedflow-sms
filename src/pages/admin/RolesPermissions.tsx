import { Fragment, useMemo, useState } from 'react';
import { Check, Download, KeyRound, Minus, ShieldCheck } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import {
  ADMIN_ROLES,
  LAB_ROLES,
  QUALITY_ROLES,
  PROCESSING_ROLES,
  PROCUREMENT_ROLES,
  RD_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  WAREHOUSE_ROLES,
  type UserRole,
} from '@/types';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, getRolePermissions, hasPermission } from '@/utils/permissions';
import styles from './Admin.module.css';

/**
 * The authorisation matrix, rendered from the real permission table rather
 * than a document that describes it — src/utils/permissions.ts is the source,
 * so this page cannot drift out of date the way a wiki page would.
 *
 * It is deliberately read-only. Permissions in this product are code, not
 * configuration: an editable matrix would imply the grants live in a database
 * that could be changed at runtime, and they do not. What an administrator
 * changes at runtime is which ROLE a user holds — that is the Users page.
 */
const ROLE_MODULES: { module: string; roles: UserRole[] }[] = [
  { module: 'Procurement', roles: PROCUREMENT_ROLES },
  { module: 'Warehouse', roles: WAREHOUSE_ROLES },
  { module: 'R&D', roles: RD_ROLES },
  { module: 'Processing', roles: PROCESSING_ROLES },
  { module: 'Laboratory', roles: LAB_ROLES },
  { module: 'Quality', roles: QUALITY_ROLES },
  { module: 'Administration', roles: ADMIN_ROLES },
];

function permissionLabel(permission: string): string {
  return permission.replace(/_/g, ' ');
}

export default function RolesPermissions() {
  const [moduleFilter, setModuleFilter] = useState<string>('Administration');
  const [onlyGranted, setOnlyGranted] = useState(false);

  const roles = useMemo(
    () => ROLE_MODULES.find((m) => m.module === moduleFilter)?.roles ?? [],
    [moduleFilter],
  );

  // Rows: by default the matrix shows the permission groups belonging to the
  // module whose roles are on screen, because a Warehouse role holding zero
  // Processing permissions is 42 columns of noise. "Show every permission"
  // widens it for the cross-module audit case.
  const groups = useMemo(() => {
    const scoped = PERMISSION_GROUPS.filter((g) => (onlyGranted ? true : g.module === moduleFilter));
    const source = scoped.length > 0 ? scoped : PERMISSION_GROUPS;
    if (!onlyGranted) return source;
    return source
      .map((g) => ({
        module: g.module,
        permissions: g.permissions.filter((p) => roles.some((r) => hasPermission(r, p))),
      }))
      .filter((g) => g.permissions.length > 0);
  }, [moduleFilter, onlyGranted, roles]);

  const grantCounts = useMemo(
    () =>
      Object.fromEntries(ROLE_MODULES.flatMap((m) => m.roles).map((r) => [r, getRolePermissions(r).length])) as Record<
        UserRole,
        number
      >,
    [],
  );

  const totalRoles = ROLE_MODULES.reduce((sum, m) => sum + m.roles.length, 0);

  function exportCsv() {
    const header = ['permission', 'group', ...roles.map((r) => ROLE_LABELS[r])];
    const lines = [header.join(',')];
    groups.forEach((group) => {
      group.permissions.forEach((permission) => {
        lines.push(
          [
            permission,
            group.module,
            ...roles.map((r) => (hasPermission(r, permission) ? 'yes' : 'no')),
          ].join(','),
        );
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seedsphere-permissions-${moduleFilter.toLowerCase().replace(/[^a-z]+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Roles &amp; permissions</h1>
            <p className={styles.subtitle}>
              The live authorisation matrix, read straight from the permission table the app enforces. Read-only by
              design: grants are code, and what an administrator changes at runtime is a user's role, on the Users page.
            </p>
          </div>
          <div className={styles.controls}>
            <Button variant="secondary" leftIcon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          <KpiCard title="Roles defined" value={String(totalRoles)} icon={KeyRound} />
          <KpiCard title="Permissions defined" value={String(ALL_PERMISSIONS.length)} icon={ShieldCheck} />
          <KpiCard title="Modules" value={String(ROLE_MODULES.length)} icon={KeyRound} />
        </div>

        <div className={styles.card}>
          <div className={styles.filterBar}>
            {ROLE_MODULES.map((m) => (
              <button
                key={m.module}
                className={`${styles.chip} ${moduleFilter === m.module ? styles.chipActive : ''}`}
                onClick={() => setModuleFilter(m.module)}
              >
                {m.module}
              </button>
            ))}
            <span className={styles.spacer} />
            <button
              className={`${styles.chip} ${onlyGranted ? styles.chipActive : ''}`}
              onClick={() => setOnlyGranted((v) => !v)}
            >
              {onlyGranted ? 'Granted permissions only' : 'This module’s permissions'}
            </button>
          </div>

          <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th className={styles.matrixRowHead}>Permission</th>
                  {roles.map((role) => (
                    <th key={role} title={ROLE_DESCRIPTIONS[role]}>
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.module}>
                    <tr className={styles.matrixGroupRow}>
                      <th colSpan={roles.length + 1}>{group.module}</th>
                    </tr>
                    {group.permissions.map((permission) => (
                      <tr key={permission}>
                        <th className={styles.matrixRowHead} title={permission}>
                          {permissionLabel(permission)}
                        </th>
                        {roles.map((role) => (
                          <td key={`${role}-${permission}`}>
                            {hasPermission(role, permission) ? (
                              <Check size={14} className={styles.yes} aria-label="granted" />
                            ) : (
                              <Minus size={14} className={styles.no} aria-label="not granted" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Role reference</h2>
          <p className={styles.sectionSubtitle}>
            What each {moduleFilter} role is for, and how many of the product's {ALL_PERMISSIONS.length} permissions it
            holds in total.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Responsibility</th>
                  <th>Permissions held</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role}>
                    <td>{ROLE_LABELS[role]}</td>
                    <td className={styles.muted}>{ROLE_DESCRIPTIONS[role]}</td>
                    <td>{grantCounts[role]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
