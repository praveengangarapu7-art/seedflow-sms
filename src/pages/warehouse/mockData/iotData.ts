import { 
  IoTSensor, 
  IoTAlert, 
  GerminationDeclineRecord, 
  MaintenanceTask, 
  EnergyConsumption,
  IoTReading,
  SensorType
} from '@/types/warehouse';

export const iotKpis = [
  { label: 'Online sensors', value: '38 / 40', sublabel: '2 offline', trend: 'neutral' },
  { label: 'Active alerts', value: '5', sublabel: '1 critical · 3 warning', trend: 'danger' },
  { label: 'Avg cold-zone temp', value: '15.2°C', sublabel: 'Within range ✓', trend: 'success' },
  { label: 'Energy today', value: '1,248 kWh', sublabel: '₹14,976 cost', trend: 'warning' },
];

export const currentReadings: Record<string, IoTReading> = {
  'Cold Zone A': { timestamp: new Date().toISOString(), zone: 'Cold Zone A', temperature: 16.5, humidity: 55, co2: 450 },
  'Cold Zone B': { timestamp: new Date().toISOString(), zone: 'Cold Zone B', temperature: 15.8, humidity: 58, co2: 480 },
  'Cold Zone C': { timestamp: new Date().toISOString(), zone: 'Cold Zone C', temperature: 17.2, humidity: 52, co2: 420 },
  'Controlled Zone': { timestamp: new Date().toISOString(), zone: 'Controlled Zone', temperature: 22.1, humidity: 45, co2: 850 },
  'Quarantine': { timestamp: new Date().toISOString(), zone: 'Quarantine', temperature: 24.5, humidity: 40, co2: 410 },
};

export const sensors: IoTSensor[] = [
  // Cold Zone A
  {
    id: 'SNS-0001', type: 'Temperature', zone: 'Cold Zone A', warehouse: 'Telangana Main',
    installedDate: '2023-01-15', lastCalibration: '2024-01-15', nextCalibration: '2025-01-15',
    status: 'Online', currentValue: 16.5, unit: '°C', thresholdMin: 14, thresholdMax: 18,
    batteryPct: 85, signalStrength: 92, lastReadingAt: new Date().toISOString(), model: 'TempGuard X1', firmwareVersion: '2.4.1'
  },
  {
    id: 'SNS-0002', type: 'Humidity', zone: 'Cold Zone A', warehouse: 'Telangana Main',
    installedDate: '2023-01-15', lastCalibration: '2024-01-15', nextCalibration: '2025-01-15',
    status: 'Online', currentValue: 55, unit: '%', thresholdMin: 50, thresholdMax: 60,
    batteryPct: 82, signalStrength: 88, lastReadingAt: new Date().toISOString()
  },
  {
    id: 'SNS-0042', type: 'Temperature', zone: 'Cold Zone A', warehouse: 'Telangana Main',
    installedDate: '2023-05-20', lastCalibration: '2024-05-20', nextCalibration: '2025-05-20',
    status: 'Offline', currentValue: 0, unit: '°C', thresholdMin: 14, thresholdMax: 18,
    batteryPct: 0, signalStrength: 0, lastReadingAt: new Date(Date.now() - 7200000).toISOString()
  },
  // Cold Zone B
  {
    id: 'SNS-0010', type: 'Temperature', zone: 'Cold Zone B', warehouse: 'Telangana Main',
    installedDate: '2023-02-10', lastCalibration: '2024-02-10', nextCalibration: '2025-02-10',
    status: 'Online', currentValue: 15.8, unit: '°C', thresholdMin: 14, thresholdMax: 18,
    batteryPct: 75, signalStrength: 95, lastReadingAt: new Date().toISOString()
  },
  {
    id: 'SNS-0011', type: 'Humidity', zone: 'Cold Zone B', warehouse: 'Telangana Main',
    installedDate: '2023-02-10', lastCalibration: '2024-02-10', nextCalibration: '2025-02-10',
    status: 'Warning', currentValue: 64, unit: '%', thresholdMin: 50, thresholdMax: 60,
    batteryPct: 70, signalStrength: 90, lastReadingAt: new Date().toISOString()
  },
  // Power Meters
  {
    id: 'SNS-0101', type: 'Power meter', zone: 'Cold Zone A', warehouse: 'Telangana Main',
    installedDate: '2023-01-15', lastCalibration: '2024-01-15', nextCalibration: '2025-01-15',
    status: 'Online', currentValue: 450, unit: 'kWh', batteryPct: 100, signalStrength: 100, lastReadingAt: new Date().toISOString()
  },
  // Add more sensors to reach 40...
  ...(Array.from({ length: 34 }).map((_, i) => ({
    id: `SNS-00${i + 20}`,
    type: (i % 4 === 0 ? 'CO2' : i % 3 === 0 ? 'Humidity' : 'Temperature') as SensorType,
    zone: ['Cold Zone C', 'Controlled Zone', 'Quarantine'][i % 3],
    warehouse: 'Telangana Main',
    installedDate: '2023-03-01',
    lastCalibration: '2024-03-01',
    nextCalibration: '2025-03-01',
    status: 'Online',
    currentValue: i % 4 === 0 ? 400 + i * 10 : i % 3 === 0 ? 50 + i : 15 + i % 10,
    unit: i % 4 === 0 ? 'ppm' : i % 3 === 0 ? '%' : '°C',
    batteryPct: 90 - i,
    signalStrength: 85 + (i % 15),
    lastReadingAt: new Date().toISOString()
  })) as IoTSensor[])
];

export const iotAlerts: IoTAlert[] = [
  {
    id: 'IOT-AL-0001', severity: 'critical', zone: 'Cold Zone A', sensor: 'SNS-0001', metric: 'Temperature',
    thresholdViolated: 'above max', measuredValue: 18.7, thresholdValue: 18, unit: '°C',
    triggeredAt: new Date(Date.now() - 840000).toISOString(),
    notificationsSent: ['SMS', 'Email', 'In-app'], durationMinutes: 14
  },
  {
    id: 'IOT-AL-0002', severity: 'critical', zone: 'Cold Zone A', sensor: 'SNS-0042', metric: 'Connectivity',
    thresholdViolated: 'sensor offline', measuredValue: 0, thresholdValue: 0, unit: '',
    triggeredAt: new Date(Date.now() - 7200000).toISOString(),
    notificationsSent: ['SMS', 'In-app'], durationMinutes: 120
  },
  {
    id: 'IOT-AL-0003', severity: 'warning', zone: 'Cold Zone B', sensor: 'SNS-0011', metric: 'Humidity',
    thresholdViolated: 'above max', measuredValue: 64, thresholdValue: 60, unit: '%',
    triggeredAt: new Date(Date.now() - 1800000).toISOString(),
    notificationsSent: ['Email', 'In-app'], durationMinutes: 30
  },
  {
    id: 'IOT-AL-0004', severity: 'warning', zone: 'Controlled Zone', sensor: 'SNS-0028', metric: 'CO2',
    thresholdViolated: 'rate of change', measuredValue: 1150, thresholdValue: 1000, unit: 'ppm',
    triggeredAt: new Date(Date.now() - 3600000).toISOString(),
    notificationsSent: ['In-app'], durationMinutes: 60
  },
  {
    id: 'IOT-AL-0005', severity: 'info', zone: 'Cold Zone C', sensor: 'SNS-0035', metric: 'Maintenance',
    thresholdViolated: 'calibration overdue', measuredValue: 0, thresholdValue: 0, unit: '',
    triggeredAt: new Date(Date.now() - 86400000).toISOString(),
    notificationsSent: ['In-app'], durationMinutes: 1440
  }
];

export const historicalReadings: Record<string, IoTReading[]> = {
  'Cold Zone A': Array.from({ length: 24 * 7 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (168 - i) * 3600000).toISOString(),
    zone: 'Cold Zone A',
    temperature: 15 + Math.random() * 3,
    humidity: 50 + Math.random() * 10,
    co2: 400 + Math.random() * 100
  })),
  'Cold Zone B': Array.from({ length: 24 * 7 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (168 - i) * 3600000).toISOString(),
    zone: 'Cold Zone B',
    temperature: 14 + Math.random() * 4,
    humidity: 55 + Math.random() * 15,
    co2: 420 + Math.random() * 80
  })),
};

export const germinationDeclineRecords: GerminationDeclineRecord[] = [
  {
    sku: 'GH-BT-102', itemName: 'Cotton Hybrid BT-2', batch: 'BAT-2024-001', zone: 'Cold Zone A',
    storedSince: '2024-01-10', monthsInStorage: 6, initialGerminationPct: 95, currentGerminationPct: 88,
    predictedExpiryDate: '2024-12-15', declineRate: 1.16, riskLevel: 'High', lastTestedDate: '2024-07-01',
    historicalReadings: [
      { month: 0, germinationPct: 95 }, { month: 2, germinationPct: 93 }, { month: 4, germinationPct: 90 }, { month: 6, germinationPct: 88 }
    ]
  },
  {
    sku: 'IR-64', itemName: 'Paddy IR-64', batch: 'BAT-2024-005', zone: 'Cold Zone B',
    storedSince: '2024-05-15', monthsInStorage: 2, initialGerminationPct: 92, currentGerminationPct: 91,
    predictedExpiryDate: '2025-08-10', declineRate: 0.5, riskLevel: 'Low', lastTestedDate: '2024-07-15',
    historicalReadings: [
      { month: 0, germinationPct: 92 }, { month: 2, germinationPct: 91 }
    ]
  },
  {
    sku: 'GH-M-204', itemName: 'Maize Hybrid', batch: 'BAT-2023-112', zone: 'Cold Zone A',
    storedSince: '2023-11-01', monthsInStorage: 8, initialGerminationPct: 94, currentGerminationPct: 78,
    predictedExpiryDate: '2024-08-20', declineRate: 2.0, riskLevel: 'Critical', lastTestedDate: '2024-07-05',
    historicalReadings: [
      { month: 0, germinationPct: 94 }, { month: 3, germinationPct: 88 }, { month: 6, germinationPct: 82 }, { month: 8, germinationPct: 78 }
    ]
  }
];

export const maintenanceTasks: MaintenanceTask[] = [
  {
    id: 'MNT-0001', asset: 'Cold Zone A Compressor 1', zone: 'Cold Zone A', taskType: 'Routine',
    description: 'Filter cleaning and coolant level check', scheduledDate: '2024-07-25',
    assignedTo: 'Suresh Kumar', status: 'Scheduled', priority: 'Medium', estimatedDurationHours: 2
  },
  {
    id: 'MNT-0002', asset: 'Sensor SNS-0042', zone: 'Cold Zone A', taskType: 'Repair',
    description: 'Investigate connectivity failure', scheduledDate: '2024-07-22',
    assignedTo: 'Ramesh Singh', status: 'In progress', priority: 'High', estimatedDurationHours: 1,
    triggeredByAlert: 'IOT-AL-0002'
  },
  {
    id: 'MNT-0003', asset: 'Cold Zone B Humidifier', zone: 'Cold Zone B', taskType: 'Calibration',
    description: 'Recalibrate humidity output', scheduledDate: '2024-07-20',
    assignedTo: 'Vikram Mehta', status: 'Completed', priority: 'High', estimatedDurationHours: 1.5,
    completedDate: '2024-07-20'
  }
];

export const energyConsumption: EnergyConsumption[] = Array.from({ length: 30 }).map((_, i) => ({
  zone: ['Cold Zone A', 'Cold Zone B', 'Cold Zone C', 'Controlled Zone', 'Quarantine'][i % 5],
  date: new Date(Date.now() - (30 - i) * 86400000).toISOString().split('T')[0],
  kwh: 50 + Math.random() * 150,
  costRupees: (50 + Math.random() * 150) * 12
}));
