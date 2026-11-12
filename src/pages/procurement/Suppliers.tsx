import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Users, Star, Award, UserPlus } from 'lucide-react';
import { ModuleLayout } from '@/components/layout/ModuleLayout/ModuleLayout';
import { ViewToggle } from '@/components/common/ViewToggle/ViewToggle';
import { Tabs } from '@/components/common/Tabs/Tabs';
import { FilterBar } from '@/components/common/FilterBar/FilterBar';
import { DataTable } from '@/components/common/DataTable/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge/StatusBadge';
import { Modal } from '@/components/common/Modal/Modal';
import { Button } from '@/components/common/Button/Button';
import { Stepper } from '@/components/common/Stepper/Stepper';
import { FileUpload } from '@/components/common/FileUpload/FileUpload';
import { KpiStrip } from './components/KpiStrip/KpiStrip';
import {
  SUPPLIER_TAB_COUNTS,
  SUPPLIER_CATEGORY_OPTIONS,
} from './mockData/suppliersData';
import { formatIndianCurrency } from '@/utils/formatters';
import { procurementNav } from '@/config/procurementNav';
import { useToast } from '@/components/common/Toast';
import type { Supplier } from '@/types/procurement';
import type { DataTableColumn } from '@/components/common/DataTable/DataTable';
import { usePermission } from '@/hooks/usePermission';
import { PERIOD_OPTIONS, isDateInPeriod, type PeriodValue } from '@/utils/periodFilter';
import styles from './Suppliers.module.css';

import { addSupplier, today, useSuppliers } from './procurementStore';
// ── Constants ──────────────────────────────────────────────────
const PAGE_SIZE = 12;

const TAB_TO_CLASS: Record<string, string> = {
  preferred: 'Preferred',
  approved: 'Approved',
  registered: 'Registered',
  blacklisted: 'Blacklisted',
};

const SUPPLIER_TABS = [
  { key: 'all', label: 'All', count: SUPPLIER_TAB_COUNTS.all },
  { key: 'preferred', label: 'Preferred', count: SUPPLIER_TAB_COUNTS.preferred },
  { key: 'approved', label: 'Approved', count: SUPPLIER_TAB_COUNTS.approved },
  { key: 'registered', label: 'Registered', count: SUPPLIER_TAB_COUNTS.registered },
  { key: 'blacklisted', label: 'Blacklisted', count: SUPPLIER_TAB_COUNTS.blacklisted },
];

const CATEGORY_FILTER_OPTIONS = [
  { label: 'All Categories', value: '' },
  ...SUPPLIER_CATEGORY_OPTIONS.filter((c) => c !== 'All Categories').map((c) => ({
    label: c,
    value: c,
  })),
];

function buildKpiItems(suppliers: Supplier[]) {
  const total     = suppliers.length;
  const preferred = suppliers.filter((s) => s.classification === 'Preferred').length;
  const avgScore  = total ? Math.round((suppliers.reduce((s, x) => s + x.overallScore, 0) / total) * 10) / 10 : 0;
  const pending   = suppliers.filter((s) => s.classification === 'Registered').length;
  return [
    { label: 'Total suppliers',    value: String(total),     icon: Users },
    { label: 'Preferred',          value: String(preferred), icon: Star },
    { label: 'Avg score',          value: String(avgScore),  icon: Award },
    { label: 'Pending onboarding', value: String(pending),   icon: UserPlus },
  ];
}

const STEP_DEFS = [
  { key: 'info', label: 'Basic info' },
  { key: 'contact', label: 'Contact & address' },
  { key: 'banking', label: 'Banking & tax' },
  { key: 'documents', label: 'Categories & docs' },
];

const CATEGORY_CHIPS = [
  'Raw Seeds',
  'Chemicals',
  'Packaging',
  'Lab Supplies',
  'Equipment',
  'Fertilizers',
  'Office Supplies',
];

// ── SupplierCard ───────────────────────────────────────────────
interface SupplierCardProps {
  supplier: Supplier;
  onClick: () => void;
}

function SupplierCard({ supplier, onClick }: SupplierCardProps) {
  const initials = supplier.name.slice(0, 2).toUpperCase();
  return (
    <div className={styles.supplierCard} onClick={onClick}>
      <div className={styles.cardTop}>
        <div className={styles.avatar}>{initials}</div>
        <StatusBadge status={supplier.classification} type="supplier" />
      </div>
      <div className={styles.cardName}>{supplier.name}</div>
      <div className={styles.cardCat}>{supplier.category}</div>
      <div className={styles.scoresRow}>
        {[
          { key: 'Quality', val: supplier.qualityScore },
          { key: 'Delivery', val: supplier.deliveryScore },
          { key: 'Cost', val: supplier.costScore },
        ].map(({ key, val }) => (
          <div key={key} className={styles.scoreCol}>
            <span className={styles.scoreKey}>{key}</span>
            <span className={styles.scoreVal}>{val}</span>
            <div className={styles.scoreBar}>
              <div className={styles.scoreBarFill} style={{ width: `${val}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.cardFooter}>
        <span>
          {supplier.totalPOs} POs · {formatIndianCurrency(supplier.totalSpend)} spend
        </span>
        <span className={styles.cardLink}>View profile →</span>
      </div>
    </div>
  );
}

// ── SupplierFormModal ──────────────────────────────────────────
interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function SupplierFormModal({ isOpen, onClose, onSubmit }: SupplierFormModalProps) {
  const [step, setStep] = useState(0);

  // Step 0 state
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [classification, setClassification] = useState('Registered');
  const [notes, setNotes] = useState('');

  // Step 1 state
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');

  // Step 2 state
  const [gst, setGst] = useState('');
  const [pan, setPan] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  // Step 3 state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number }>>([]);

  const { addToast } = useToast();

  function handleClose() {
    setStep(0);
    onClose();
  }

  function handleSubmit() {
    const created = addSupplier({
      name: supplierName.trim() || 'New supplier',
      code: supplierCode.trim() || undefined,
      category: selectedCategories[0] ?? 'General',
      classification: classification as Supplier['classification'],
      contact: { person: contactPerson, email, phone },
      address: { line1: address1, city, state, pincode, country },
      gst, pan,
      bankDetails: { accountHolder, accountNumber, ifsc, bank: bankName },
      paymentTerms,
      qualityScore: 0, deliveryScore: 0, costScore: 0, overallScore: 0,
      totalPOs: 0, totalSpend: 0, lastPODate: '', onboardingDate: today(),
      documents: uploadedFiles.map((f) => ({ name: f.name, uploadedDate: today() })),
      notes: [notes, selectedCategories.length > 1 ? `Categories: ${selectedCategories.join(', ')}` : ''].filter(Boolean).join(' · '),
    });
    addToast(`${created.name} added as ${created.code}`, 'success');
    handleClose();
    onSubmit();
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  const footer = (
    <div className={styles.footerRow}>
      <div>
        {step > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => s - 1)}>
            ← Back
          </Button>
        )}
      </div>
      <div className={styles.footerRight}>
        <Button variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        {step < 3 ? (
          <Button variant="primary" size="sm" onClick={() => setStep((s) => s + 1)}>
            Next →
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Save supplier
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add new supplier" size="xl" footer={footer}>
      <Stepper
        steps={STEP_DEFS}
        currentStep={step}
        onStepClick={(i) => {
          if (i < step) setStep(i);
        }}
      />

      <div style={{ marginTop: 24 }}>
        {step === 0 && (
          <>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Basic information</div>
              <div className={styles.formGrid2} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Supplier name <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input
                    className={styles.formInput}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Supplier code</label>
                  <input
                    className={styles.formInput}
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    placeholder="Auto-generated if blank"
                  />
                </div>
              </div>
              <div className={styles.formField} style={{ marginBottom: 12 }}>
                <label className={styles.formLabel}>Classification</label>
                <select
                  className={styles.formSelect}
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                >
                  <option value="Registered">Registered</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Notes</label>
                <textarea
                  className={styles.formTextarea}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes…"
                />
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Contact details</div>
              <div className={styles.formGrid3} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Contact person</label>
                  <input
                    className={styles.formInput}
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email</label>
                  <input
                    className={styles.formInput}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Phone</label>
                  <input
                    className={styles.formInput}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-XXXXX-XXXXX"
                  />
                </div>
              </div>
            </div>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Address</div>
              <div className={styles.formField} style={{ marginBottom: 12 }}>
                <label className={styles.formLabel}>Address line 1</label>
                <input
                  className={styles.formInput}
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className={styles.formGrid3} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>City</label>
                  <input
                    className={styles.formInput}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>State</label>
                  <input
                    className={styles.formInput}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Pincode</label>
                  <input
                    className={styles.formInput}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="6-digit pincode"
                  />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Country</label>
                <input
                  className={styles.formInput}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Tax details</div>
              <div className={styles.formGrid2} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>GST number</label>
                  <input
                    className={styles.formInput}
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    placeholder="15-char GSTIN"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>PAN number</label>
                  <input
                    className={styles.formInput}
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    placeholder="10-char PAN"
                  />
                </div>
              </div>
            </div>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Banking details</div>
              <div className={styles.formGrid2} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Account holder</label>
                  <input
                    className={styles.formInput}
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="As per bank records"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Account number</label>
                  <input
                    className={styles.formInput}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Account number"
                  />
                </div>
              </div>
              <div className={styles.formGrid3} style={{ marginBottom: 12 }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>IFSC code</label>
                  <input
                    className={styles.formInput}
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="IFSC code"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Bank name</label>
                  <input
                    className={styles.formInput}
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank name"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Payment terms</label>
                  <select
                    className={styles.formSelect}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Advance">Advance</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Categories</div>
              <div className={styles.chipRow}>
                {CATEGORY_CHIPS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.chip} ${selectedCategories.includes(cat) ? styles.chipActive : ''}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.formSection}>
              <div className={styles.formSectionTitle}>Documents</div>
              <FileUpload
                label="Upload documents"
                accept=".pdf,.jpg,.png"
                multiple
                uploadedFiles={uploadedFiles}
                onFilesAdded={(files) =>
                  setUploadedFiles((prev) => [
                    ...prev,
                    ...files.map((f) => ({ name: f.name, size: f.size })),
                  ])
                }
                onRemoveFile={(i) =>
                  setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function Suppliers() {
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [period, setPeriod] = useState<PeriodValue>('all');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mockSuppliers] = useSuppliers();

  const periodFiltered = useMemo(
    () => mockSuppliers.filter((s) => !s.lastPODate || isDateInPeriod(s.lastPODate, period)),
    [period, mockSuppliers]
  );

  const tabFiltered = useMemo(
    () =>
      activeTab === 'all'
        ? periodFiltered
        : periodFiltered.filter((s) => s.classification === TAB_TO_CLASS[activeTab]),
    [periodFiltered, activeTab]
  );

  const tabsWithCounts = SUPPLIER_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? periodFiltered.length : periodFiltered.filter((s) => s.classification === TAB_TO_CLASS[t.key]).length,
  }));

  const filtered = useMemo(
    () =>
      tabFiltered.filter((s) => {
        if (
          search &&
          !s.name.toLowerCase().includes(search.toLowerCase()) &&
          !s.code.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (categoryFilter && s.category !== categoryFilter) return false;
        return true;
      }),
    [tabFiltered, search, categoryFilter]
  );

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: DataTableColumn<Supplier>[] = [
    { key: 'code', header: 'Code', width: '110px', sortable: true },
    { key: 'name', header: 'Supplier', sortable: true },
    { key: 'category', header: 'Category', width: '130px' },
    {
      key: 'classification',
      header: 'Classification',
      width: '130px',
      render: (row) => <StatusBadge status={row.classification} type="supplier" />,
    },
    {
      key: 'overallScore',
      header: 'Score',
      width: '150px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              background: 'var(--color-border-light)',
              borderRadius: 3,
            }}
          >
            <div
              style={{
                width: `${row.overallScore}%`,
                height: '100%',
                background: 'var(--color-primary)',
                borderRadius: 3,
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              minWidth: 24,
            }}
          >
            {row.overallScore}
          </span>
        </div>
      ),
    },
    { key: 'totalPOs', header: 'POs', width: '60px', align: 'center' as const },
    {
      key: 'totalSpend',
      header: 'Spend',
      width: '110px',
      align: 'right' as const,
      render: (row) => formatIndianCurrency(row.totalSpend),
    },
    { key: 'lastPODate', header: 'Last PO', width: '110px' },
  ];

  const canAddSupplier = usePermission('add_supplier');

  return (
    <ModuleLayout moduleName="Procurement" moduleIcon={ShoppingCart} navItems={procurementNav}>
      {/* Page top */}
      <div className={styles.pageTop}>
        <div className={styles.pageTopLeft}>
          <h1 className={styles.pageTopTitle}>Supplier management</h1>
          <p className={styles.pageTopSub}>Manage your supplier network and performance</p>
        </div>
        <div className={styles.pageTopActions}>
          <select
            className={styles.periodSelect}
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as PeriodValue);
              setPage(1);
            }}
            aria-label="Period filter"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ViewToggle view={view} onChange={setView} />
          {canAddSupplier && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              Add supplier
            </Button>
          )}
        </div>
      </div>
      <div className={styles.divider} />

      {/* KPI strip */}
      <KpiStrip items={buildKpiItems(periodFiltered)} />

      {/* Tabs */}
      <div style={{ marginTop: 20 }}>
        <Tabs
          tabs={tabsWithCounts}
          activeTab={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPage(1);
          }}
        />
      </div>

      {/* Filter bar */}
      <div style={{ marginTop: 12 }}>
        <FilterBar
          searchPlaceholder="Search by name, GST, contact…"
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          filters={[
            {
              label: 'Category',
              key: 'cat',
              options: CATEGORY_FILTER_OPTIONS,
              value: categoryFilter,
              onChange: (val) => {
                setCategoryFilter(val);
                setPage(1);
              },
            },
          ]}
        />
      </div>

      {/* Content */}
      <div style={{ marginTop: 16 }}>
        {view === 'grid' ? (
          <div className={styles.grid}>
            {paginated.map((supplier) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onClick={() => navigate(`/procurement/suppliers/${supplier.id}`)}
              />
            ))}
          </div>
        ) : (
          <DataTable<Supplier>
            columns={columns}
            data={paginated}
            rowKey="id"
            onRowClick={(row) => navigate(`/procurement/suppliers/${row.id}`)}
            selectable
            selectedRows={selectedIds}
            onSelectionChange={setSelectedIds}
            pagination={{
              total: filtered.length,
              pageSize: PAGE_SIZE,
              currentPage: page,
              onPageChange: setPage,
            }}
          />
        )}

        {view === 'grid' && filtered.length > PAGE_SIZE && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginTop: 24,
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span
              style={{
                padding: '6px 12px',
                fontSize: 13,
                color: 'var(--color-text-muted)',
              }}
            >
              Page {page} of {Math.ceil(filtered.length / PAGE_SIZE)}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Add supplier modal */}
      <SupplierFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={() => setShowAddModal(false)}
      />
    </ModuleLayout>
  );
}
