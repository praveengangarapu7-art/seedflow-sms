import { Nursery } from '@/types/rd';

export const nurseryKpis = [
  { title: 'Active nurseries', value: '8' },
  { title: 'Crosses planned', value: '124' },
  { title: 'Crosses successful', value: '89', subValue: '72% success rate' },
  { title: 'Plants observed', value: '12,840' },
];

export const nurseries: Nursery[] = [
  {
    id: 'NUR-2026-001',
    name: 'Cotton Crossing Block A',
    type: 'Crossing block',
    programRefs: ['BP-2026-001'],
    crop: 'Cotton',
    location: { facility: 'Main Research Station', block: 'RS-42', rows: 20, plants: 50 },
    season: 'Kharif 2026',
    status: 'Growing',
    sownDate: '2026-06-15',
    entriesPlanted: [
      { entryCode: 'P01', parentMale: 'GRM-2026-001', parentFemale: 'GRM-2026-045', plotsAssigned: 5, survived: 48 },
      { entryCode: 'P02', parentMale: 'GRM-2026-005', parentFemale: 'GRM-2026-045', plotsAssigned: 5, survived: 50 },
    ],
    crossesMade: 120,
    crossesSuccessful: 85,
    responsibleStaff: ['A. Desai', 'S. Kulkarni'],
  },
  {
    id: 'NUR-2026-002',
    name: 'Maize Selection Nursery 1',
    type: 'Selection nursery',
    programRefs: ['BP-2026-002'],
    crop: 'Maize',
    location: { facility: 'South Field Station', block: 'MZ-08', rows: 40, plants: 100 },
    season: 'Kharif 2026',
    status: 'Sown',
    sownDate: '2026-06-20',
    entriesPlanted: [],
    crossesMade: 0,
    crossesSuccessful: 0,
    responsibleStaff: ['V. Kumar'],
  },
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `NUR-2026-${String(i + 3).padStart(3, '0')}`,
    name: `Nursery ${i + 3}`,
    type: ['Crossing block', 'Selection nursery', 'Multiplication', 'Quarantine'][i % 4] as any,
    programRefs: [],
    crop: ['Paddy', 'Sunflower', 'Sorghum', 'Soybean'][i % 4],
    location: { facility: 'Research Farm', block: `B-${i + 1}`, rows: 10, plants: 50 },
    season: 'Kharif 2026',
    status: ['Planned', 'Sown', 'Growing', 'Harvesting', 'Completed'][i % 5] as any,
    entriesPlanted: [],
    crossesMade: 0,
    crossesSuccessful: 0,
    responsibleStaff: ['Staff Member'],
  })),
];
