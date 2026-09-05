import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, RefreshCw, ScrollText, ShieldCheck } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import { adminNav } from '@/config/adminNav';
import { usePermission } from '@/hooks/usePermission';
import { fetchAuditLogs, type AuditLogRow } from '@/services/seedLotRealtimeClient';
import { useAdminSession } from './useAdminSession';
import styles from './Admin.module.css';

/**
 * The platform audit trail.
 *
 * audit_logs has been written to since the first phase of this project — by
 * seed-lot changes, allocations, workflow approvals, governance corrections,
 * privacy actions and (new with this module) user administration. Until now
 * nothing read it back: GET /audit-logs existed on the server with no client
 * wrapper at all, so the trail was effectively write-only. This page is the
 * read side.
 *
 * A row's before/after state is shown side by side rather than as one JSON
 * blob, because the question an auditor actually asks is "what changed", not
 * "what did the record look like".
 */
const PAGE_SIZE = 50;

function toDisplayJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AuditLogs() {
  const { token, loading: sessionLoading, error: sessionError, reload } = useAdminSession();
  const canExport = usePermission('export_audit_logs');

  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');

  const load = useCallback(
    async (accessToken: string, pageIndex: number, entity: string) => {
      setBusy(true);
      setError(null);
      try {
        // Ask for one more than a page so "next" can be disabled honestly
        // rather than guessing there is more.
        const data = await fetchAuditLogs(accessToken, {
          entityType: entity || undefined,
          limit: PAGE_SIZE + 1,
          offset: pageIndex * PAGE_SIZE,
        });
        setHasMore(data.length > PAGE_SIZE);
        setRows(data.slice(0, PAGE_SIZE));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load the audit trail');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (token) void load(token, page, entityType);
  }, [token, page, entityType, load]);

  // Action and actor are filtered client-side: the server endpoint only
  // supports entityType/entityId, and adding query params there would mean
  // touching a route several other pages already depend on.
  const visible = useMemo(() => {
    const actionNeedle = actionFilter.trim().toLowerCase();
    const actorNeedle = actorFilter.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionNeedle && !r.action.toLowerCase().includes(actionNeedle)) return false;
      if (actorNeedle && !r.performed_by.toLowerCase().includes(actorNeedle)) return false;
      return true;
    });
  }, [rows, actionFilter, actorFilter]);

  const entityTypesPresent = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))).sort(), [rows]);
  const actorsOnPage = useMemo(() => new Set(rows.map((r) => r.performed_by)).size, [rows]);

  function exportCsv() {
    const header = ['created_at', 'entity_type', 'entity_id', 'action', 'performed_by'];
    const escape = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const lines = [
      header.join(','),
      ...visible.map((r) =>
        [r.created_at, r.entity_type, r.entity_id, r.action, r.performed_by].map((v) => escape(String(v))).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seedsphere-audit-trail-page-${page + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleLayout moduleName="Administration" moduleIcon={ShieldCheck} navItems={adminNav}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Audit logs</h1>
            <p className={styles.subtitle}>
              Every recorded change on the platform, newest first — seed lots, allocations, workflow approvals,
              governance corrections, privacy actions and user administration, in one trail.
            </p>
          </div>
          <div className={styles.controls}>
            <Button
              variant="secondary"
              leftIcon={RefreshCw}
              onClick={() => (token ? void load(token, page, entityType) : reload())}
            >
              Refresh
            </Button>
            {canExport && (
              <Button variant="secondary" leftIcon={Download} onClick={exportCsv} disabled={visible.length === 0}>
                Export page
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

        <div className={styles.kpiGrid}>
          <KpiCard title="Entries on this page" value={String(rows.length)} icon={ScrollText} />
          <KpiCard title="Distinct actors" value={String(actorsOnPage)} icon={ShieldCheck} />
          <KpiCard title="Entity types" value={String(entityTypesPresent.length)} icon={ScrollText} />
          <KpiCard title="Page" value={String(page + 1)} icon={ScrollText} />
        </div>

        <div className={styles.card}>
          <div className={styles.filterBar}>
            <select
              className={styles.select}
              value={entityType}
              onChange={(e) => {
                setPage(0);
                setEntityType(e.target.value);
              }}
            >
              <option value="">All entity types</option>
              {entityTypesPresent.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className={styles.textInput}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action…"
              style={{ maxWidth: 200 }}
            />
            <input
              className={styles.textInput}
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              placeholder="Filter by who…"
              style={{ maxWidth: 220 }}
            />
          </div>

          {sessionLoading || busy ? (
            <div className={styles.emptyState}>Loading…</div>
          ) : visible.length === 0 ? (
            <div className={styles.emptyState}>No audit entries match these filters.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }} />
                    <th>When</th>
                    <th>Action</th>
                    <th>Entity type</th>
                    <th>Entity</th>
                    <th>Performed by</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const isOpen = expanded === row.id;
                    const before = toDisplayJson(row.before_state);
                    const after = toDisplayJson(row.after_state);
                    const meta = toDisplayJson(row.metadata);
                    const hasDetail = Boolean(before || after || meta);
                    return (
                      <Fragment key={row.id}>
                        <tr>
                          <td>
                            {hasDetail && (
                              <button
                                className={styles.rowButton}
                                aria-label={isOpen ? 'Hide detail' : 'Show detail'}
                                onClick={() => setExpanded(isOpen ? null : row.id)}
                              >
                                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            )}
                          </td>
                          <td>{new Date(row.created_at).toLocaleString()}</td>
                          <td>
                            <span className={`${styles.badge} ${styles.badgeInfo}`}>{row.action}</span>
                          </td>
                          <td>{row.entity_type}</td>
                          <td className={styles.mono} title={row.entity_id}>
                            {row.entity_id.slice(0, 8)}…
                          </td>
                          <td>{row.performed_by}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={6}>
                              <div className={styles.diffGrid}>
                                <div>
                                  <span className={styles.metaLabel}>Before</span>
                                  <pre className={styles.jsonBlock}>{before ?? '—'}</pre>
                                </div>
                                <div>
                                  <span className={styles.metaLabel}>After</span>
                                  <pre className={styles.jsonBlock}>{after ?? '—'}</pre>
                                </div>
                              </div>
                              {meta && (
                                <div style={{ marginTop: '0.6rem' }}>
                                  <span className={styles.metaLabel}>Metadata</span>
                                  <pre className={styles.jsonBlock}>{meta}</pre>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.actionRow} style={{ marginTop: '0.75rem' }}>
            <Button variant="ghost" disabled={page === 0 || busy} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Previous
            </Button>
            <Button variant="ghost" disabled={!hasMore || busy} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
            <span className={styles.spacer} />
            <span className={styles.muted} style={{ fontSize: '0.8rem' }}>
              Showing {visible.length} of {rows.length} loaded entries
            </span>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
