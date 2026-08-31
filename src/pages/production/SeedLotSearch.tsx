import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Columns3, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/common/Button/Button';
import { Input } from '@/components/common/Input/Input';
import {
  DEMO_ACCOUNTS,
  deleteSavedSearch,
  fetchSavedSearches,
  fetchSeedLotSearchFilterOptions,
  login,
  saveSearch,
  searchSeedLots,
  type SavedSearch,
  type SeedLotSearchFilterOptions,
  type SeedLotSearchFilters,
  type SeedLotSearchResult,
} from '@/services/seedLotRealtimeClient';
import styles from './SeedLotSearch.module.css';

const SEED_CLASSES = ['Breeder', 'Foundation', 'Certified'];
const TESTING_STATUSES: Array<{ value: NonNullable<SeedLotSearchFilters['testingStatus']>; label: string }> = [
  { value: 'not_submitted', label: 'Not submitted' },
  { value: 'testing', label: 'Testing in progress' },
  { value: 'certified', label: 'Lab certified' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPTY_FILTERS: SeedLotSearchFilters = {};

export default function SeedLotSearch() {
  const [accountIndex, setAccountIndex] = useState(0);
  const [token, setToken] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<SeedLotSearchFilterOptions | null>(null);
  const [filters, setFilters] = useState<SeedLotSearchFilters>(EMPTY_FILTERS);
  const [results, setResults] = useState<SeedLotSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedSearchesError, setSavedSearchesError] = useState<string | null>(null);
  const [newSearchName, setNewSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);

  const refreshSavedSearches = useCallback(async (accessToken: string) => {
    try {
      const data = await fetchSavedSearches(accessToken);
      setSavedSearches(data);
    } catch (err) {
      setSavedSearchesError(err instanceof Error ? err.message : 'Unable to load saved searches');
    }
  }, []);

  const runSearch = useCallback(async (accessToken: string, activeFilters: SeedLotSearchFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchSeedLots(accessToken, activeFilters);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search seed lots');
    } finally {
      setLoading(false);
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

        const options = await fetchSeedLotSearchFilterOptions(accessToken);
        if (cancelled) return;
        setFilterOptions(options);
        await runSearch(accessToken, EMPTY_FILTERS);
        await refreshSavedSearches(accessToken);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to connect to the search service');
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);

  const updateFilter = <K extends keyof SeedLotSearchFilters>(key: K, value: SeedLotSearchFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    if (!token) return;
    void runSearch(token, filters);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    if (token) void runSearch(token, EMPTY_FILTERS);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedLots = results.filter((r) => selectedIds.has(r.id));

  const handleSaveSearch = async () => {
    const name = newSearchName.trim();
    if (!name || !token) return;
    setSavingSearch(true);
    setSavedSearchesError(null);
    try {
      await saveSearch(token, name, filters);
      setNewSearchName('');
      await refreshSavedSearches(token);
    } catch (err) {
      setSavedSearchesError(err instanceof Error ? err.message : 'Unable to save this search');
    } finally {
      setSavingSearch(false);
    }
  };

  const handleLoadSavedSearch = (saved: SavedSearch) => {
    setFilters(saved.filters);
    if (token) void runSearch(token, saved.filters);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    if (!token) return;
    try {
      await deleteSavedSearch(token, id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setSavedSearchesError(err instanceof Error ? err.message : 'Unable to delete this saved search');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Seed Lot Search &amp; Discovery</h1>
          <p className={styles.subtitle}>
            Find seed lots by variety, crop, seed class, source, production date, available quantity, storage location,
            and certification status — plus agro-climatic zone, disease resistance, and yield-benchmark filters pulled
            from the variety catalog. Select two or more lots to compare them side by side.
          </p>
        </div>
        <select className={styles.select} value={accountIndex} onChange={(e) => setAccountIndex(Number(e.target.value))}>
          {DEMO_ACCOUNTS.map((account, index) => (
            <option key={account.email} value={index}>
              Viewing as: {account.role}
            </option>
          ))}
        </select>
      </div>

      {error ? <div className={styles.card}><span className={styles.errorText}>{error}</span></div> : null}

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <div className={styles.field} style={{ marginBottom: '1rem' }}>
          <label className={styles.label}>Search</label>
          <Input
            placeholder="Search by crop, variety, or lot code — e.g. Tomato"
            value={filters.q ?? ''}
            onChange={(e) => updateFilter('q', e.target.value || undefined)}
          />
        </div>
        <div className={styles.filterGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Variety name</label>
            <Input placeholder="e.g. PaddyGold" value={filters.variety ?? ''} onChange={(e) => updateFilter('variety', e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Crop</label>
            <select className={styles.select} value={filters.crop ?? ''} onChange={(e) => updateFilter('crop', e.target.value || undefined)}>
              <option value="">Any crop</option>
              {filterOptions?.crops.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Seed class</label>
            <select className={styles.select} value={filters.seedClass ?? ''} onChange={(e) => updateFilter('seedClass', e.target.value || undefined)}>
              <option value="">Any class</option>
              {SEED_CLASSES.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Source organization</label>
            <select
              className={styles.select}
              value={filters.sourceOrganizationId ?? ''}
              onChange={(e) => updateFilter('sourceOrganizationId', e.target.value || undefined)}
            >
              <option value="">Any organization</option>
              {filterOptions?.organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Production date from</label>
            <Input type="date" value={filters.productionDateFrom ?? ''} onChange={(e) => updateFilter('productionDateFrom', e.target.value || undefined)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Production date to</label>
            <Input type="date" value={filters.productionDateTo ?? ''} onChange={(e) => updateFilter('productionDateTo', e.target.value || undefined)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Min. available quantity</label>
            <Input type="number" min="0" value={filters.minAvailableQuantity ?? ''} onChange={(e) => updateFilter('minAvailableQuantity', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Storage zone</label>
            <select className={styles.select} value={filters.storageZone ?? ''} onChange={(e) => updateFilter('storageZone', e.target.value || undefined)}>
              <option value="">Any location</option>
              {filterOptions?.storageZones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Certification status</label>
            <select
              className={styles.select}
              value={filters.certificationStatus ?? ''}
              onChange={(e) => updateFilter('certificationStatus', (e.target.value || undefined) as SeedLotSearchFilters['certificationStatus'])}
            >
              <option value="">Any status</option>
              <option value="certified">Certified Only</option>
              <option value="not_certified">Not certified</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Lab testing status</label>
            <select
              className={styles.select}
              value={filters.testingStatus ?? ''}
              onChange={(e) => updateFilter('testingStatus', (e.target.value || undefined) as SeedLotSearchFilters['testingStatus'])}
            >
              <option value="">Any testing status</option>
              {TESTING_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Agro-climatic zone</label>
            <select className={styles.select} value={filters.agroClimaticZone ?? ''} onChange={(e) => updateFilter('agroClimaticZone', e.target.value || undefined)}>
              <option value="">Any zone</option>
              {filterOptions?.agroClimaticZones.map((zone) => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Disease resistance trait</label>
            <select className={styles.select} value={filters.diseaseResistanceTrait ?? ''} onChange={(e) => updateFilter('diseaseResistanceTrait', e.target.value || undefined)}>
              <option value="">Any trait</option>
              {filterOptions?.diseaseTraits.map((trait) => (
                <option key={trait} value={trait}>{trait}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Min. yield benchmark (per acre)</label>
            <Input type="number" min="0" value={filters.minYieldBenchmark ?? ''} onChange={(e) => updateFilter('minYieldBenchmark', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
        <div className={styles.controls} style={{ marginTop: '1rem' }}>
          <Button leftIcon={Search} isLoading={loading} onClick={handleSearch}>Search</Button>
          <Button variant="secondary" leftIcon={X} onClick={handleClear}>Clear Filters</Button>
        </div>
        <div className={styles.controls} style={{ marginTop: '0.75rem' }}>
          <Input
            placeholder="Name this search to save it"
            value={newSearchName}
            onChange={(e) => setNewSearchName(e.target.value)}
          />
          <Button
            variant="secondary"
            leftIcon={Bookmark}
            isLoading={savingSearch}
            disabled={!newSearchName.trim()}
            onClick={handleSaveSearch}
          >
            Save Search
          </Button>
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>My Searches</h2>
        {savedSearchesError ? <span className={styles.errorText}>{savedSearchesError}</span> : null}
        {savedSearches.length === 0 ? (
          <div className={styles.emptyState}>No saved searches yet — set some filters above and click "Save Search".</div>
        ) : (
          <ul className={styles.savedSearchList}>
            {savedSearches.map((saved) => (
              <li key={saved.id} className={styles.savedSearchItem}>
                <button type="button" className={styles.savedSearchName} onClick={() => handleLoadSavedSearch(saved)}>
                  {saved.name}
                </button>
                <span className={styles.savedSearchDate}>{new Date(saved.created_at).toLocaleDateString()}</span>
                <button
                  type="button"
                  className={styles.savedSearchDelete}
                  aria-label={`Delete saved search ${saved.name}`}
                  onClick={() => void handleDeleteSavedSearch(saved.id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.sectionTitle}>Results ({results.length})</h2>
          <Button
            variant="secondary"
            leftIcon={Columns3}
            disabled={selectedIds.size < 2}
            onClick={() => setShowComparison(true)}
          >
            Compare Selected ({selectedIds.size})
          </Button>
        </div>
        {results.length === 0 ? (
          <div className={styles.emptyState}>No seed lots match these filters.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th></th>
                  <th>Lot</th>
                  <th>Crop / Variety</th>
                  <th>Class</th>
                  <th>Source</th>
                  <th>Production Date</th>
                  <th>Available</th>
                  <th>Storage</th>
                  <th>Certification</th>
                  <th>Testing</th>
                  <th>Yield Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {results.map((lot) => (
                  <tr key={lot.id} className={selectedIds.has(lot.id) ? styles.rowSelected : undefined}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(lot.id)} onChange={() => toggleSelect(lot.id)} />
                    </td>
                    <td><strong>{lot.lot_code}</strong></td>
                    <td>{lot.crop} — {lot.variety}</td>
                    <td>{lot.stage}</td>
                    <td>{lot.organization_name ?? '—'}</td>
                    <td>{new Date(lot.production_date).toLocaleDateString()}</td>
                    <td>{lot.quantity_available}{lot.unit}</td>
                    <td>{lot.storage_zones.length > 0 ? lot.storage_zones.join(', ') : '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${lot.is_certified ? styles.statusCertified : styles.statusUncertified}`}>
                        {lot.is_certified ? 'Certified' : 'Not certified'}
                      </span>
                    </td>
                    <td>{lot.testing_status.replace('_', ' ')}</td>
                    <td>{lot.yield_benchmark_per_acre != null ? `${lot.yield_benchmark_per_acre} ${lot.variety_yield_unit ?? 'kg'}/acre` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showComparison && selectedLots.length >= 2 ? (
        <div className={styles.card}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.sectionTitle}>Comparison</h2>
            <Button variant="secondary" size="sm" leftIcon={X} onClick={() => setShowComparison(false)}>Close</Button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <th className={styles.compareLabel}>Lot</th>
                  {selectedLots.map((lot) => <td key={lot.id}><strong>{lot.lot_code}</strong></td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Crop / Variety</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{lot.crop} — {lot.variety}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Seed class</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{lot.stage}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Source organization</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{lot.organization_name ?? '—'}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Production date</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{new Date(lot.production_date).toLocaleDateString()}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Available quantity</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{lot.quantity_available}{lot.unit}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Storage location</th>
                  {selectedLots.map((lot) => <td key={lot.id}>{lot.storage_zones.length > 0 ? lot.storage_zones.join(', ') : '—'}</td>)}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Certification</th>
                  {selectedLots.map((lot) => (
                    <td key={lot.id}>
                      <span className={`${styles.statusBadge} ${lot.is_certified ? styles.statusCertified : styles.statusUncertified}`}>
                        {lot.is_certified ? 'Certified' : 'Not certified'}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Agro-climatic suitability</th>
                  {selectedLots.map((lot) => (
                    <td key={lot.id}>{lot.agro_climatic_suitability && lot.agro_climatic_suitability.length > 0 ? lot.agro_climatic_suitability.join(', ') : 'Not in catalog'}</td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Disease resistance</th>
                  {selectedLots.map((lot) => (
                    <td key={lot.id}>
                      {lot.disease_resistance_profile && lot.disease_resistance_profile.length > 0
                        ? lot.disease_resistance_profile.map((d) => `${d.disease} (${d.resistanceLevel})`).join(', ')
                        : 'Not in catalog'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className={styles.compareLabel}>Yield benchmark</th>
                  {selectedLots.map((lot) => (
                    <td key={lot.id}>{lot.yield_benchmark_per_acre != null ? `${lot.yield_benchmark_per_acre} ${lot.variety_yield_unit ?? 'kg'}/acre` : 'Not in catalog'}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
