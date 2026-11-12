import type { Department } from './quality.common';

export interface StarterRequirement {
  regulation: string;
  reference?: string;
  title: string;
  description: string;
  category:
    | 'licensing'
    | 'certification'
    | 'labelling_packaging'
    | 'record_keeping'
    | 'quality_testing'
    | 'storage_handling'
    | 'dealer_sales'
    | 'customer_export'
    | 'other';
  department: Department;
}

const NOTE = ' (Starter entry — confirm applicability and current wording with regulatory counsel before relying on it.)';

/**
 * A neutral starting checklist for an Indian seed company, so a first
 * assessment does not begin from a blank page. Titles are deliberately
 * phrased as obligations the company must be able to evidence, and no clause
 * numbers are asserted — the assessor adds the exact reference once verified.
 * Loading is idempotent (unique on regulation + title).
 */
export const SEED_COMPANY_STARTER: StarterRequirement[] = [
  {
    regulation: 'Seeds Act, 1966 / Seeds (Control) Order, 1983',
    title: 'Valid seed dealer / seed business licence for each place of business',
    description: 'Every place where seed is stored or sold is covered by a current licence, displayed and renewed before expiry.' + NOTE,
    category: 'licensing',
    department: 'operations',
  },
  {
    regulation: 'Seeds Act, 1966',
    title: 'Only notified or registered varieties are produced and sold',
    description: 'Each variety sold is a notified kind/variety or otherwise registered, with the status recorded against the variety.' + NOTE,
    category: 'certification',
    department: 'production',
  },
  {
    regulation: 'Seeds Act, 1966 / Seed certification agency requirements',
    title: 'Seed production is registered and field-inspected for certification',
    description: 'Seed production plots are registered with the certification agency and inspected at the required stages; inspection reports are retained.' + NOTE,
    category: 'certification',
    department: 'production',
  },
  {
    regulation: 'Indian Minimum Seed Certification Standards',
    title: 'Each lot is tested against the minimum standards before release',
    description: 'Physical purity, germination, moisture and (where applicable) genetic purity are tested and recorded per lot, and lots below standard are not released.' + NOTE,
    category: 'quality_testing',
    department: 'laboratory',
  },
  {
    regulation: 'Seeds Rules, 1968',
    title: 'Seed containers are labelled/tagged with the required particulars',
    description: 'Every container carries the declared particulars (lot number, variety, purity, germination, date of test, validity, net quantity, producer details).' + NOTE,
    category: 'labelling_packaging',
    department: 'production',
  },
  {
    regulation: 'Legal Metrology (Packaged Commodities) Rules, 2011',
    title: 'Packaged seed carries the mandatory declarations',
    description: 'Net quantity, price, month and year of packing and manufacturer/packer details are declared as required on every pack.' + NOTE,
    category: 'labelling_packaging',
    department: 'production',
  },
  {
    regulation: 'Seeds Act, 1966 / Seeds Rules, 1968',
    title: 'Purchase, production and sale records are maintained and available for inspection',
    description: 'Records of seed received, produced, stored and sold are complete, retained for the required period and retrievable on request.' + NOTE,
    category: 'record_keeping',
    department: 'operations',
  },
  {
    regulation: 'Seeds Act, 1966',
    title: 'Seed lots are traceable from source seed to dealer',
    description: 'For any lot sold, the parent lot, production, testing, packaging and dispatch records can be produced together.' + NOTE,
    category: 'record_keeping',
    department: 'quality',
  },
  {
    regulation: 'Seeds Rules, 1968',
    title: 'Seed past its validity period is re-tested before it is sold',
    description: 'Lots approaching or beyond the declared validity are re-tested and re-labelled, or withdrawn from sale.' + NOTE,
    category: 'quality_testing',
    department: 'laboratory',
  },
  {
    regulation: 'Seeds Act, 1966',
    title: 'A reference sample is retained for each released lot',
    description: 'A sealed reference sample of each released lot is retained for at least the validity period to support disputes and inspections.' + NOTE,
    category: 'quality_testing',
    department: 'quality',
  },
  {
    regulation: 'Seeds Act, 1966',
    title: 'Seed inspectors can sample and inspect without obstruction',
    description: 'Staff know how to receive a seed inspector, supply samples against a receipt and retain the counterpart.' + NOTE,
    category: 'dealer_sales',
    department: 'operations',
  },
  {
    regulation: 'Seed storage good practice',
    title: 'Storage keeps lots segregated, identified and protected',
    description: 'Warehouse storage separates lots and varieties, controls temperature/humidity and pests, and rotates stock first-in-first-out.' + NOTE,
    category: 'storage_handling',
    department: 'warehouse',
  },
  {
    regulation: 'Seeds (Control) Order, 1983',
    title: 'Seed is sold only through licensed dealers with lot-level invoices',
    description: 'Dealers are verified as licensed and every invoice records the lot sold, so a lot can be recalled to its buyers.' + NOTE,
    category: 'dealer_sales',
    department: 'operations',
  },
  {
    regulation: "Protection of Plant Varieties and Farmers' Rights Act, 2001",
    title: 'Protected and registered varieties are handled within their rights',
    description: 'Use of protected varieties, parental lines and denominations is covered by the appropriate licence or registration.' + NOTE,
    category: 'certification',
    department: 'rd',
  },
  {
    regulation: 'Customer and consumer protection requirements',
    title: 'Customer complaints are recorded, investigated and resolved to a documented process',
    description: 'Complaints are logged, linked to the lot, investigated for root cause and closed with corrective action.' + NOTE,
    category: 'dealer_sales',
    department: 'quality',
  },
  {
    regulation: 'Internal quality management system',
    title: 'Staff are trained on the SOPs that apply to their work',
    description: 'Current SOPs are issued to the people who perform the work and their acknowledgement or training is recorded.' + NOTE,
    category: 'other',
    department: 'hr_training',
  },
  {
    regulation: 'Export / import-country phytosanitary requirements',
    title: 'Exports meet phytosanitary and importing-country requirements',
    description: 'Required phytosanitary certificates, treatments and import-country conditions are checked before each export consignment.' + NOTE,
    category: 'customer_export',
    department: 'logistics',
  },
  {
    regulation: 'Customer contract specifications',
    title: 'Customer-specific quality and audit requirements are identified and met',
    description: 'Contracted specifications and customer audit expectations are captured and the company can evidence them.' + NOTE,
    category: 'customer_export',
    department: 'quality',
  },
  {
    regulation: 'State seed regulations',
    title: 'State-specific registration, reporting and licensing duties are identified and met',
    description: 'For each state of operation, the additional registrations, returns and fees are listed and tracked to completion.' + NOTE,
    category: 'licensing',
    department: 'operations',
  },
];
