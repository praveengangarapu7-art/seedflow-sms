import { useCallback, useEffect, useState } from 'react';
import { PackageCheck, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import { Modal } from '@/components/common/Modal/Modal';
import { useToast } from '@/components/common/Toast/ToastContext';
import {
  DEMO_ACCOUNTS,
  createSeedRequest,
  fetchFarmers,
  fetchMyAllocations,
  fetchSeedLotSearchFilterOptions,
  login,
  searchSeedLots,
  type FarmerRow,
  type MyAllocationEntry,
  type SeedLotSearchFilterOptions,
  type SeedLotSearchResult,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedFarmerProgram.module.css';

// Farmer-Centric Seed Allocation & Distribution (Extend #9): the Farmer
// Portal side of the feature. SeedFarmerProgram.tsx already covers the
// staff side (view pending requests, approve/deny, fulfill, deliver) —
// this page is the farmer-facing complement: "My Allocations" (crops, the
// specific seed lot reserved, and where/when it's ready to collect) and
// "Request Seed Lot" (search real inventory, add lots to a cart, submit).
// There is no separate farmer login in this app (established by the Crop
// Planning Wizard task) — staff act on a farmer's behalf, so this page
// works the same way the wizard does: pick an account (Producer by
// default, matching the feature's own "Producer role logs in" test), then
// pick which farmer you're viewing/acting for.

const CREATE_REQUEST_ROLES = new Set(['Admin', 'Producer', 'Warehouse Manager']);

function statusLabel(status: string): string {
  if (status === 'allocated') return 'Ready for Pickup';
  if (status === 'requested') return 'Pending Approval';
  if (status === 'delivered') return 'Picked Up';
  return status;
}

function statusClass(status: string): string {
  return (
    {
      requested: styles.statusRequested,
      approved: styles.statusApproved,
      allocated: styles.statusAllocated,
      delivered: styles.statusDelivered,
      rejected: styles.statusRejected,
      cancelled: styles.statusCancelled,
    }[status] ?? styles.statusRequested
  );
}

interface CartItem {
  lot: SeedLotSearchResult;
  quantity: string;
}

export default function FarmerSeedPortal() {
  const { addToast } = useToast();

  const [accountIndex, setAccountIndex] = useState(2); // Producer by default
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string>(DEMO_ACCOUNTS[2].role);

  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [farmerId, setFarmerId] = useState('');
  const [allocations, setAllocations] = useState<MyAllocationEntry[]>([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cartOpen, setCartOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState<SeedLotSearchFilterOptions | null>(null);
  const [searchCrop, setSearchCrop] = useState('');
  const [searchVariety, setSearchVariety] = useState('');
  const [certifiedOnly, setCertifiedOnly] = useState(true);
  const [searchResults, setSearchResults] = useState<SeedLotSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submittingCart, setSubmittingCart] = useState(false);

  const selectedFarmer = farmers.find((f) => f.id === farmerId);

  const loadAllocations = useCallback(async (accessToken: string, forFarmerId: string) => {
    if (!forFarmerId) {
      setAllocations([]);
      return;
    }
    setLoadingAllocations(true);
    try {
      setAllocations(await fetchMyAllocations(accessToken, forFarmerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load allocations');
    } finally {
      setLoadingAllocations(false);
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
        const [farmerList, options] = await Promise.all([fetchFarmers(accessToken), fetchSeedLotSearchFilterOptions(accessToken)]);
        if (cancelled) return;
        setFarmers(farmerList);
        setFilterOptions(options);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the farmer seed portal');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  useEffect(() => {
    if (token && farmerId) void loadAllocations(token, farmerId);
    else setAllocations([]);
  }, [token, farmerId, loadAllocations]);

  const handleSearch = async () => {
    if (!token) return;
    setSearching(true);
    setError(null);
    try {
      const results = await searchSeedLots(token, {
        crop: searchCrop.trim() || undefined,
        variety: searchVariety.trim() || undefined,
        certificationStatus: certifiedOnly ? 'certified' : undefined,
        minAvailableQuantity: 1,
      });
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search seed lots');
    } finally {
      setSearching(false);
    }
  };

  const addToCart = (lot: SeedLotSearchResult) => {
    setCart((prev) => (prev.some((item) => item.lot.id === lot.id) ? prev : [...prev, { lot, quantity: '50' }]));
  };

  const removeFromCart = (lotId: string) => {
    setCart((prev) => prev.filter((item) => item.lot.id !== lotId));
  };

  const updateCartQuantity = (lotId: string, quantity: string) => {
    setCart((prev) => prev.map((item) => (item.lot.id === lotId ? { ...item, quantity } : item)));
  };

  const handleSubmitCart = async () => {
    if (!token || !farmerId || cart.length === 0) return;
    if (!CREATE_REQUEST_ROLES.has(role)) {
      addToast(`Requesting seed lots requires one of: ${Array.from(CREATE_REQUEST_ROLES).join(', ')}.`, 'error');
      return;
    }
    for (const item of cart) {
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        addToast(`Enter a valid quantity for ${item.lot.lot_code}`, 'error');
        return;
      }
    }
    setSubmittingCart(true);
    try {
      for (const item of cart) {
        await createSeedRequest(token, {
          farmerId,
          crop: item.lot.crop,
          variety: item.lot.variety,
          quantity: Number(item.quantity),
          seedLotId: item.lot.id,
        });
      }
      addToast(`Submitted ${cart.length} seed lot request${cart.length > 1 ? 's' : ''}`, 'success');
      setCart([]);
      setCartOpen(false);
      await loadAllocations(token, farmerId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Unable to submit one or more requests', 'error');
    } finally {
      setSubmittingCart(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Farmer Seed Portal</h1>
          <p className={styles.subtitle}>
            My Allocations shows this farmer's seed requests — crop/variety, the specific lot reserved once ready, and
            where to collect it. Request Seed Lot searches real inventory and adds lots to a cart to submit together.
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
          <select id="farmer" className={styles.select} value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
            <option value="">Select a farmer</option>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>{farmer.name} — {farmer.region}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>My Allocations</h2>
            <p className={styles.sectionSubtitle}>{selectedFarmer ? `Showing requests for ${selectedFarmer.name}` : 'Select a farmer to see their requests.'}</p>
          </div>
          <Button leftIcon={ShoppingCart} disabled={!farmerId} onClick={() => setCartOpen(true)}>Request Seed Lot</Button>
        </div>

        {!farmerId ? null : loadingAllocations ? (
          <div className={styles.emptyState}>Loading…</div>
        ) : allocations.length === 0 ? (
          <div className={styles.emptyState}>No seed requests yet for this farmer.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Crop / Variety</th>
                  <th>Qty</th>
                  <th>Seed Lot</th>
                  <th>Pickup Location</th>
                  <th>Status</th>
                  <th>Ready Since</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td>{a.crop} — {a.variety}</td>
                    <td>{a.quantity_requested} {a.unit}</td>
                    <td>{a.lot_code ?? '—'}</td>
                    <td>{a.storage_zones.length > 0 ? a.storage_zones.join(', ') : '—'}</td>
                    <td><span className={`${styles.statusBadge} ${statusClass(a.status)}`}>{statusLabel(a.status)}</span></td>
                    <td>{a.ready_since ? new Date(a.ready_since).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cartOpen ? (
        <Modal
          isOpen
          onClose={() => setCartOpen(false)}
          title="Request Seed Lot"
          size="lg"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span className={styles.sectionSubtitle} style={{ margin: 0 }}>{cart.length} lot{cart.length === 1 ? '' : 's'} in cart</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="ghost" onClick={() => setCartOpen(false)}>Close</Button>
                <Button
                  leftIcon={PackageCheck}
                  isLoading={submittingCart}
                  disabled={cart.length === 0}
                  onClick={() => void handleSubmitCart()}
                >
                  Submit {cart.length > 0 ? `${cart.length} Request${cart.length > 1 ? 's' : ''}` : 'Requests'}
                </Button>
              </div>
            </div>
          }
        >
          {!CREATE_REQUEST_ROLES.has(role) ? (
            <p className={styles.errorText}>
              Signed in as {role} — requesting a seed lot requires {Array.from(CREATE_REQUEST_ROLES).join(', ')}.
            </p>
          ) : null}

          <div className={styles.formRow} style={{ marginBottom: '0.6rem' }}>
            <div className={styles.field}>
              <label className={styles.label}>Crop</label>
              <select className={styles.select} value={searchCrop} onChange={(e) => setSearchCrop(e.target.value)}>
                <option value="">Any crop</option>
                {filterOptions?.crops.map((crop) => (
                  <option key={crop} value={crop}>{crop}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Variety</label>
              <Input placeholder="e.g. PaddyGold" value={searchVariety} onChange={(e) => setSearchVariety(e.target.value)} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={certifiedOnly} onChange={(e) => setCertifiedOnly(e.target.checked)} />
            Certified Only
          </label>
          <Button leftIcon={Search} isLoading={searching} onClick={() => void handleSearch()} style={{ marginBottom: '1rem' }}>
            Search
          </Button>

          {searchResults.length > 0 ? (
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Crop / Variety</th>
                    <th>Available</th>
                    <th>Certified</th>
                    <th>Storage</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((lot) => {
                    const inCart = cart.some((item) => item.lot.id === lot.id);
                    return (
                      <tr key={lot.id}>
                        <td>{lot.lot_code}</td>
                        <td>{lot.crop} — {lot.variety}</td>
                        <td>{lot.quantity_available}{lot.unit}</td>
                        <td>{lot.is_certified ? 'Yes' : 'No'}</td>
                        <td>{lot.storage_zones.length > 0 ? lot.storage_zones.join(', ') : '—'}</td>
                        <td>
                          <Button size="sm" variant="secondary" disabled={inCart} onClick={() => addToCart(lot)}>
                            {inCart ? 'In Cart' : 'Add to Cart'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {cart.length > 0 ? (
            <div>
              <h3 className={styles.sectionTitle} style={{ fontSize: '0.95rem' }}>Cart</h3>
              {cart.map((item) => (
                <div key={item.lot.id} className={styles.regionBlock}>
                  <div className={styles.regionHeader}>
                    <span className={styles.regionTitle}>{item.lot.lot_code} — {item.lot.crop} / {item.lot.variety}</span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.lot.id)}
                      style={{ background: 'none', border: 'none', color: '#a3352b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      aria-label={`Remove ${item.lot.lot_code} from cart`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className={styles.field} style={{ maxWidth: 160 }}>
                    <label className={styles.label}>Quantity ({item.lot.unit})</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateCartQuantity(item.lot.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
