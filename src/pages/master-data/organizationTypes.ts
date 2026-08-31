export const ORGANIZATION_TYPE_VALUES = [
  'breeder',
  'producer',
  'laboratory',
  'certification_agency',
  'warehouse',
  'dealer',
  'government_authority',
] as const;

export const organizationTypeOptions: { value: string; label: string }[] = [
  { value: 'breeder', label: 'Breeder' },
  { value: 'producer', label: 'Producer' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'certification_agency', label: 'Certification Agency' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'government_authority', label: 'Government Authority' },
];

export function organizationTypeLabel(type: string): string {
  return organizationTypeOptions.find((option) => option.value === type)?.label ?? type;
}
