import { useCallback, useEffect, useState } from 'react';
import { Banknote, RefreshCw, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { KpiCard } from '@/components/common/KpiCard/KpiCard';
import {
  DEMO_ACCOUNTS,
  FINANCING_TYPES,
  approveFinancing,
  disburseFinancing,
  fetchFarmers,
  fetchFinancingAccounts,
  fetchFinancingCostsForLot,
  fetchInsuranceContext,
  fetchOrganizations,
  fetchSeedLots,
  login,
  markFinancingDefaulted,
  recordFinancingRepayment,
  rejectFinancing,
  requestFinancing,
  triggerPostHarvestRepayment,
  type FarmerRow,
  type FinancingAccount,
  type FinancingCostSummary,
  type FinancingType,
  type InsuranceContext,
  type OrganizationRow,
  type RealtimeSeedLot,
} from '@/services/seedLotRealtimeClient';
import styles from './SupplyChainFinancing.module.css';

const FINANCING_REQUEST_ROLES = new Set(['Admin', 'Breeder', 'Producer', 'Warehouse Manager']);

function statusBadgeClass(status: string): string {
  const key = `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
  return (styles as Record<string, string>)[key] ?? '';
}

export default function SupplyChainFinancing() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[0].role);

  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [lots, setLots] = useState<RealtimeSeedLot[]>([]);
  const [accounts, setAccounts] = useState<FinancingAccount[]>([]);

  const [newFinancing, setNewFinancing] = useState({
    financingType: 'breeder_credit' as FinancingType,
    borrowerOrganizationId: '',
    borrowerFarmerId: '',
    seedLotId: '',
    principalAmount: '',
    annualInterestRatePercent: '',
    receivableAmount: '',
    linkedInsuranceCrop: '',
    linkedInsuranceSeason: '',
  });

  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const [repayInputs, setRepayInputs] = useState<Record<string, { amount: string; reference: string }>>({});

  const [costsLotId, setCostsLotId] = useState('');
  const [costs, setCosts] = useState<FinancingCostSummary | null>(null);
  const [insuranceCrop, setInsuranceCrop] = useState('');
  const [insuranceSeason, setInsuranceSeason] = useState('');
  const [insuranceContext, setInsuranceContext] = useState<InsuranceContext | null | undefined>(undefined);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const orgName = (id: string | null) => (id ? orgs.find((o) => o.id === id)?.name ?? id : '—');
  const farmerName = (id: string | null) => (id ? farmers.find((f) => f.id === id)?.name ?? id : '—');

  const loadAll = useCallback(async (accessToken: string) => {
    setError(null);
    try {
      const [orgList, farmerList, lotList, accountList] = await Promise.all([
        fetchOrganizations(accessToken),
        fetchFarmers(accessToken),
        fetchSeedLots(accessToken),
        fetchFinancingAccounts(accessToken),
      ]);
      setOrgs(orgList);
      setFarmers(farmerList);
      setLots(lotList);
      setAccounts(accountList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load financing data');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const account = DEMO_ACCOUNTS[accountIndex];

    async function bootstrap() {
      setError(null);
      try {
        const { accessToken } = await login(account.email, account.password);
        if (cancelled) return;
        setToken(accessToken);
        setRole(account.role);
        await loadAll(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the financing service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const handleRefresh = () => {
    if (token) void loadAll(token);
  };

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = () =>
    withBusy(async () => {
      if (!token || !newFinancing.principalAmount || !newFinancing.annualInterestRatePercent) {
        setError('Principal amount and interest rate are required.');
        return;
      }
      const isFarmer = newFinancing.financingType === 'farmer_microfinance';
      if (isFarmer && !newFinancing.borrowerFarmerId) {
        setError('Select a borrower farmer for microfinance.');
        return;
      }
      if (!isFarmer && !newFinancing.borrowerOrganizationId) {
        setError('Select a borrower organization.');
        return;
      }
      if (newFinancing.financingType === 'warehouse_receivables' && !newFinancing.receivableAmount) {
        setError('Receivable amount is required for warehouse receivables financing.');
        return;
      }

      const account = await requestFinancing(token, {
        financingType: newFinancing.financingType,
        borrowerOrganizationId: isFarmer ? undefined : newFinancing.borrowerOrganizationId,
        borrowerFarmerId: isFarmer ? newFinancing.borrowerFarmerId : undefined,
        seedLotId: newFinancing.seedLotId || undefined,
        principalAmount: Number(newFinancing.principalAmount),
        annualInterestRatePercent: Number(newFinancing.annualInterestRatePercent),
        receivableAmount: newFinancing.financingType === 'warehouse_receivables' ? Number(newFinancing.receivableAmount) : undefined,
        linkedInsuranceCrop: newFinancing.linkedInsuranceCrop.trim() || undefined,
        linkedInsuranceSeason: newFinancing.linkedInsuranceSeason.trim() || undefined,
      });
      setMessage(`Financing requested (${account.status}).`);
      setNewFinancing({ ...newFinancing, principalAmount: '', annualInterestRatePercent: '', receivableAmount: '' });
      await loadAll(token);
    });

  const handleAction = (id: string, action: 'approve' | 'reject' | 'disburse' | 'trigger' | 'repay' | 'default') =>
    withBusy(async () => {
      if (!token) return;
      if (action === 'approve') await approveFinancing(token, id);
      else if (action === 'disburse') await disburseFinancing(token, id);
      else if (action === 'trigger') await triggerPostHarvestRepayment(token, id);
      else if (action === 'reject') {
        const reason = reasonInputs[id]?.trim();
        if (!reason) {
          setError('Enter a rejection reason.');
          return;
        }
        await rejectFinancing(token, id, reason);
      } else if (action === 'default') {
        const reason = reasonInputs[id]?.trim();
        if (!reason) {
          setError('Enter a default reason.');
          return;
        }
        await markFinancingDefaulted(token, id, reason);
      } else if (action === 'repay') {
        const input = repayInputs[id];
        if (!input?.amount || !input?.reference) {
          setError('Enter the repaid amount and a payment reference.');
          return;
        }
        await recordFinancingRepayment(token, id, { repaidAmount: Number(input.amount), paymentReference: input.reference });
      }
      setMessage(`Financing ${action}d.`);
      await loadAll(token);
    });

  const handleLookupCosts = () =>
    withBusy(async () => {
      if (!token || !costsLotId) return;
      setCosts(await fetchFinancingCostsForLot(token, costsLotId));
    });

  const handleLookupInsurance = () =>
    withBusy(async () => {
      if (!token || !insuranceCrop.trim()) {
        setError('Enter a crop to look up insurance context.');
        return;
      }
      setInsuranceContext(await fetchInsuranceContext(token, insuranceCrop.trim(), insuranceSeason.trim() || undefined));
    });

  const canRequest = FINANCING_REQUEST_ROLES.has(role);
  const isAdmin = role === 'Admin';
  const totalPrincipalOutstanding = accounts.filter((a) => a.status === 'disbursed' || a.status === 'repaying').reduce((sum, a) => sum + a.principal_amount, 0);
  const defaultedCount = accounts.filter((a) => a.status === 'defaulted').length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Supply Chain Financing &amp; Credit Programs</h1>
          <p className={styles.subtitle}>
            Breeder credit for Foundation lot production, farmer microfinance linked to seed purchases, and warehouse
            receivables financing — tracked through seed lot allocations, with real accrued-interest calculations and
            repayment triggered once a harvest is confirmed on record.
          </p>
        </div>
        <div className={styles.controls}>
          <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
            {DEMO_ACCOUNTS.map((account, index) => (
              <option key={account.email} value={index}>
                Viewing as: {account.role}
              </option>
            ))}
          </select>
          <Button variant="secondary" leftIcon={RefreshCw} onClick={handleRefresh}>Refresh</Button>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}
      {message ? <div className={styles.card}><span className={styles.successText}>{message}</span></div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
        <KpiCard title="Financing Accounts" value={String(accounts.length)} icon={Wallet} />
        <KpiCard title="Principal Outstanding" value={totalPrincipalOutstanding.toLocaleString()} icon={Banknote} />
        <KpiCard title="Defaulted Accounts" value={String(defaultedCount)} icon={TrendingUp} />
        <KpiCard title="Insured Crops Checked" value={insuranceContext !== undefined ? '1+' : '0'} icon={ShieldCheck} />
      </div>

      <div className={styles.grid}>
        <div>
          {canRequest && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Request Financing</h2>
              <div className={styles.formRow}>
                <select className={styles.select} value={newFinancing.financingType} onChange={(e) => setNewFinancing((f) => ({ ...f, financingType: e.target.value as FinancingType }))}>
                  {FINANCING_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
                {newFinancing.financingType === 'farmer_microfinance' ? (
                  <select className={styles.select} value={newFinancing.borrowerFarmerId} onChange={(e) => setNewFinancing((f) => ({ ...f, borrowerFarmerId: e.target.value }))}>
                    <option value="">Select a farmer</option>
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                ) : (
                  <select className={styles.select} value={newFinancing.borrowerOrganizationId} onChange={(e) => setNewFinancing((f) => ({ ...f, borrowerOrganizationId: e.target.value }))}>
                    <option value="">Select an organization</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className={styles.formRow}>
                <select className={styles.select} value={newFinancing.seedLotId} onChange={(e) => setNewFinancing((f) => ({ ...f, seedLotId: e.target.value }))}>
                  <option value="">Linked seed lot (optional)</option>
                  {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>{lot.lot_code}</option>
                  ))}
                </select>
                <input className={styles.numberInput} type="number" placeholder="Principal" value={newFinancing.principalAmount} onChange={(e) => setNewFinancing((f) => ({ ...f, principalAmount: e.target.value }))} />
                <input className={styles.numberInput} type="number" placeholder="Rate % / yr" value={newFinancing.annualInterestRatePercent} onChange={(e) => setNewFinancing((f) => ({ ...f, annualInterestRatePercent: e.target.value }))} />
              </div>
              {newFinancing.financingType === 'warehouse_receivables' && (
                <div className={styles.formRow}>
                  <input className={styles.numberInput} type="number" placeholder="Receivable amt" value={newFinancing.receivableAmount} onChange={(e) => setNewFinancing((f) => ({ ...f, receivableAmount: e.target.value }))} />
                </div>
              )}
              <div className={styles.formRow}>
                <input className={styles.textInput} placeholder="Insured crop (optional)" value={newFinancing.linkedInsuranceCrop} onChange={(e) => setNewFinancing((f) => ({ ...f, linkedInsuranceCrop: e.target.value }))} />
                <input className={styles.textInput} placeholder="Insured season (optional)" value={newFinancing.linkedInsuranceSeason} onChange={(e) => setNewFinancing((f) => ({ ...f, linkedInsuranceSeason: e.target.value }))} />
                <Button size="sm" isLoading={busy} onClick={() => void handleRequest()}>Request</Button>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Financing Costs for a Seed Lot</h2>
            <div className={styles.formRow}>
              <select className={styles.select} value={costsLotId} onChange={(e) => setCostsLotId(e.target.value)}>
                <option value="">Select a seed lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>{lot.lot_code}</option>
                ))}
              </select>
              <Button size="sm" isLoading={busy} onClick={() => void handleLookupCosts()}>Look Up</Button>
            </div>
            {costs && (
              <div className={styles.row}>
                <div>
                  <strong>{costs.financingCount} financing account(s)</strong>
                  <div className={styles.rowMeta}>Principal: {costs.totalPrincipal.toLocaleString()} · Accrued interest: {costs.totalAccruedInterest.toLocaleString()}</div>
                </div>
                <span className={styles.scoreValue}>Total due: {costs.totalAmountDue.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Crop Insurance Context</h2>
            <p className={styles.sectionSubtitle}>Reads existing recorded crop insurance data — informational risk context for a financing decision.</p>
            <div className={styles.formRow}>
              <input className={styles.textInput} placeholder="Crop" value={insuranceCrop} onChange={(e) => setInsuranceCrop(e.target.value)} />
              <input className={styles.textInput} placeholder="Season (optional)" value={insuranceSeason} onChange={(e) => setInsuranceSeason(e.target.value)} />
              <Button size="sm" isLoading={busy} onClick={() => void handleLookupInsurance()}>Look Up</Button>
            </div>
            {insuranceContext === null ? (
              <div className={styles.emptyState}>No insurance records found for this crop/season.</div>
            ) : insuranceContext ? (
              <div className={styles.row}>
                <div>
                  <strong>{insuranceContext.crop} — {insuranceContext.season}</strong>
                  <div className={styles.rowMeta}>{insuranceContext.recordCount} record(s), {insuranceContext.claimsCount} claims</div>
                </div>
                <span className={styles.scoreValue}>{insuranceContext.totalClaimAmount.toLocaleString()}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.sectionTitle}>Financing Accounts</h2>
          {accounts.length === 0 ? (
            <div className={styles.emptyState}>No financing accounts yet.</div>
          ) : (
            accounts.map((a) => (
              <div key={a.id} className={styles.row}>
                <div>
                  <strong>{a.financing_type.replace('_', ' ')}</strong>
                  <span className={`${styles.statusBadge} ${statusBadgeClass(a.status)}`} style={{ marginLeft: '0.5rem' }}>{a.status}</span>
                  <div className={styles.rowMeta}>
                    {a.borrower_organization_id ? orgName(a.borrower_organization_id) : farmerName(a.borrower_farmer_id)} — principal {a.principal_amount.toLocaleString()} @ {a.annual_interest_rate_percent}%/yr
                    {a.amount_due != null ? ` · due ${a.amount_due.toLocaleString()} by ${a.repayment_due_date}` : ''}
                  </div>
                  {a.status === 'requested' && isAdmin && (
                    <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                      <input className={styles.textInput} placeholder="Rejection reason…" value={reasonInputs[a.id] ?? ''} onChange={(e) => setReasonInputs((prev) => ({ ...prev, [a.id]: e.target.value }))} />
                      <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleAction(a.id, 'reject')}>Reject</Button>
                    </div>
                  )}
                  {a.status === 'repaying' && isAdmin && (
                    <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                      <input className={styles.numberInput} type="number" placeholder="Amount" value={repayInputs[a.id]?.amount ?? ''} onChange={(e) => setRepayInputs((prev) => ({ ...prev, [a.id]: { amount: e.target.value, reference: prev[a.id]?.reference ?? '' } }))} />
                      <input className={styles.textInput} placeholder="Payment reference" value={repayInputs[a.id]?.reference ?? ''} onChange={(e) => setRepayInputs((prev) => ({ ...prev, [a.id]: { amount: prev[a.id]?.amount ?? '', reference: e.target.value } }))} />
                      <Button size="sm" isLoading={busy} onClick={() => void handleAction(a.id, 'repay')}>Record Repayment</Button>
                    </div>
                  )}
                  {(a.status === 'disbursed' || a.status === 'repaying') && isAdmin && (
                    <div className={styles.formRow} style={{ marginTop: '0.4rem' }}>
                      <input className={styles.textInput} placeholder="Default reason…" value={reasonInputs[a.id] ?? ''} onChange={(e) => setReasonInputs((prev) => ({ ...prev, [a.id]: e.target.value }))} />
                      <Button size="sm" variant="danger" isLoading={busy} onClick={() => void handleAction(a.id, 'default')}>Mark Defaulted</Button>
                    </div>
                  )}
                </div>
                <div className={styles.rowActions}>
                  {a.status === 'requested' && isAdmin && (
                    <Button size="sm" isLoading={busy} onClick={() => void handleAction(a.id, 'approve')}>Approve</Button>
                  )}
                  {a.status === 'approved' && isAdmin && (
                    <Button size="sm" isLoading={busy} onClick={() => void handleAction(a.id, 'disburse')}>Disburse</Button>
                  )}
                  {a.status === 'disbursed' && canRequest && (
                    <Button size="sm" variant="secondary" isLoading={busy} onClick={() => void handleAction(a.id, 'trigger')}>Trigger Repayment</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
