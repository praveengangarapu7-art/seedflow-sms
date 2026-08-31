import { PackageRun } from '@/types/processing';

export const packages: PackageRun[] = [];

// Aurangabad cotton batch final runs
for (let i = 1; i <= 30; i++) {
  packages.push({
    id: `PKG-BT-2026-1142-${String(i).padStart(4, '0')}`,
    batchId: 'BT-2026-1142',
    crop: 'Cotton',
    variety: 'Bt RCH-2 BG-II',
    packSize: i <= 20 ? '1 kg' : '5 kg',
    unitsPacked: i <= 20 ? 50 : 10,
    totalWeight: i <= 20 ? 50 : 50,
    labelIssueDate: '2026-06-13',
    qrCodeStatus: 'Applied',
    certificationLevel: 'Foundation',
    status: 'Stored',
  });
}

// Hyderabad paddy runs
for (let i = 31; i <= 60; i++) {
  packages.push({
    id: `PKG-BT-2026-1140-${String(i).padStart(4, '0')}`,
    batchId: 'BT-2026-1140',
    crop: 'Paddy',
    variety: 'Pusa Basmati 1121',
    packSize: i <= 45 ? '10 kg' : '25 kg',
    unitsPacked: i <= 45 ? 20 : 8,
    totalWeight: i <= 45 ? 200 : 200,
    labelIssueDate: '2026-06-11',
    qrCodeStatus: 'Applied',
    certificationLevel: 'Foundation',
    status: 'Dispatched',
  });
}
export { packages as default };
