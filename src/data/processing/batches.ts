import { ProcessingBatch } from '@/types/processing';

export const batches: ProcessingBatch[] = [
  {
    id: 'BT-2026-1142',
    sourceLots: ['LOT-COT-2026-0142'],
    crop: 'Cotton',
    variety: 'Bt RCH-2 BG-II',
    plant: 'Aurangabad Plant',
    inputQuantity: 8200,
    currentStage: 'Cleaning',
    progress: 45,
    startedDate: '2026-06-10T08:00:00Z',
    expectedCompletion: '2026-06-13T18:00:00Z',
    recipeId: 'RCP-COT-001',
    targetGrade: 'Foundation Seed',
    operator: 'Gopal Patil',
    operatorAvatar: 'GP',
    status: 'In Progress',
    stageHistory: [
      {
        stage: 'Planned',
        timestamp: '2026-06-09T14:00:00Z',
        durationHours: 0,
        operator: 'Mohammed Ismail',
        parameters: {},
      },
    ],
    qualityCheckpoints: {
      pre: {
        inspectorName: 'Satish Kamble',
        timestamp: '2026-06-10T08:30:00Z',
        moisture: 11.2,
        purity: 97.8,
        vigor: 'High',
        decision: 'Pass',
      },
    },
    labResults: [],
    losses: {
      cleaning: 0,
      drying: 0,
      grading: 0,
      treatment: 0,
      rejected: 0,
    },
  },
  {
    id: 'BT-2026-1141',
    sourceLots: ['LOT-COT-2026-0143'],
    crop: 'Cotton',
    variety: 'Bt RCH-2 BG-II',
    plant: 'Aurangabad Plant',
    inputQuantity: 10300,
    currentStage: 'Treatment',
    progress: 75,
    startedDate: '2026-06-08T08:00:00Z',
    expectedCompletion: '2026-06-12T17:00:00Z',
    recipeId: 'RCP-COT-002',
    targetGrade: 'Certified Seed',
    operator: 'Suresh Patil',
    operatorAvatar: 'SP',
    status: 'In Progress',
    stageHistory: [
      {
        stage: 'Cleaning',
        timestamp: '2026-06-08T10:00:00Z',
        durationHours: 6,
        operator: 'Suresh Patil',
        parameters: { airFlowRate: 40, meshSize: '4.5mm', purity: 98 },
      },
      {
        stage: 'Drying',
        timestamp: '2026-06-09T08:00:00Z',
        durationHours: 12,
        operator: 'Suresh Patil',
        parameters: { temp: 40, moisture: 9 },
      },
      {
        stage: 'Grading',
        timestamp: '2026-06-10T09:00:00Z',
        durationHours: 8,
        operator: 'Suresh Patil',
        parameters: { sieveSizeR1: '4.0mm', sieveSizeR2: '3.6mm' },
      },
    ],
    qualityCheckpoints: {
      pre: {
        inspectorName: 'Satish Kamble',
        timestamp: '2026-06-08T08:30:00Z',
        moisture: 10.5,
        purity: 98,
        vigor: 'Good',
        decision: 'Pass',
      },
      inProcess: {
        inspectorName: 'Satish Kamble',
        timestamp: '2026-06-10T17:30:00Z',
        moisture: 8.9,
        purity: 99.1,
        decision: 'Pass',
      },
    },
    labResults: [],
    losses: {
      cleaning: 200,
      drying: 100,
      grading: 400,
      treatment: 50,
      rejected: 0,
    },
  },
  {
    id: 'BT-2026-1140',
    sourceLots: ['LOT-RIC-2026-0201'],
    crop: 'Paddy',
    variety: 'Pusa Basmati 1121',
    plant: 'Hyderabad Plant',
    inputQuantity: 10800,
    currentStage: 'Packaging',
    progress: 90,
    startedDate: '2026-06-05T08:00:00Z',
    expectedCompletion: '2026-06-11T12:00:00Z',
    recipeId: 'RCP-RIC-001',
    targetGrade: 'Foundation Seed',
    operator: 'J. Srinivas',
    operatorAvatar: 'JS',
    status: 'In Progress',
    stageHistory: [],
    qualityCheckpoints: {},
    labResults: [
      {
        sampleId: 'LB-2026-0287',
        sentDate: '2026-06-07',
        receivedDate: '2026-06-09',
        status: 'Passed',
        germination: 93,
        purity: 99.2,
        moisture: 12.2,
        vigor: 'Strong',
        decision: 'Pass',
      },
    ],
    losses: {
      cleaning: 150,
      drying: 80,
      grading: 300,
      treatment: 20,
      rejected: 0,
    },
  },
  {
    id: 'BT-2026-1135',
    sourceLots: ['LOT-WHE-2026-0301'],
    crop: 'Wheat',
    variety: 'HD-3086',
    plant: 'Indore Plant',
    inputQuantity: 15500,
    currentStage: 'Completed',
    progress: 100,
    startedDate: '2026-06-01T08:00:00Z',
    expectedCompletion: '2026-06-04T17:00:00Z',
    recipeId: 'RCP-WHE-001',
    targetGrade: 'Certified Seed',
    operator: 'Kartar Singh',
    operatorAvatar: 'KS',
    status: 'Completed',
    stageHistory: [],
    qualityCheckpoints: {},
    labResults: [
      {
        sampleId: 'LB-2026-0275',
        sentDate: '2026-06-03',
        receivedDate: '2026-06-05',
        status: 'Passed',
        germination: 94,
        purity: 99.5,
        moisture: 10.8,
        vigor: 'Excellent',
        decision: 'Pass',
      },
    ],
    losses: {
      cleaning: 250,
      drying: 120,
      grading: 500,
      treatment: 30,
      rejected: 0,
    },
  },
  {
    id: 'BT-2026-1143',
    sourceLots: ['LOT-RIC-2026-0202'],
    crop: 'Paddy',
    variety: 'IR-64',
    plant: 'Hyderabad Plant',
    inputQuantity: 12000,
    currentStage: 'Cleaning',
    progress: 10,
    startedDate: '2026-06-11T09:00:00Z',
    expectedCompletion: '2026-06-14T17:00:00Z',
    recipeId: 'RCP-RIC-002',
    targetGrade: 'Certified Seed',
    operator: 'M. Ali',
    operatorAvatar: 'MA',
    status: 'In Progress',
    stageHistory: [],
    qualityCheckpoints: {},
    labResults: [],
    losses: { cleaning: 0, drying: 0, grading: 0, treatment: 0, rejected: 0 },
  },
  {
    id: 'BT-2026-1144',
    sourceLots: ['LOT-COT-2026-0144'],
    crop: 'Cotton',
    variety: 'Suraj',
    plant: 'Aurangabad Plant',
    inputQuantity: 5700,
    currentStage: 'Planned',
    progress: 0,
    recipeId: 'RCP-COT-003',
    targetGrade: 'Truthful Label',
    operator: 'Gopal Patil',
    operatorAvatar: 'GP',
    status: 'Planned',
    stageHistory: [],
    qualityCheckpoints: {},
    labResults: [],
    losses: { cleaning: 0, drying: 0, grading: 0, treatment: 0, rejected: 0 },
  },
];

// Dynamically generate batches to reach 35+
for (let i = 1; i <= 32; i++) {
  const cropsList = ['Cotton', 'Paddy', 'Wheat', 'Maize', 'Pulses'];
  const cropsItem = cropsList[i % cropsList.length];
  const plantsList = ['Aurangabad Plant', 'Hyderabad Plant', 'Indore Plant'];
  const plantItem = plantsList[i % plantsList.length];
  
  let varietyItem = 'Suraj';
  let recipeItem = 'RCP-COT-003';
  if (cropsItem === 'Paddy') {
    varietyItem = 'IR-64';
    recipeItem = 'RCP-RIC-002';
  } else if (cropsItem === 'Wheat') {
    varietyItem = 'PBW-725';
    recipeItem = 'RCP-WHE-002';
  } else if (cropsItem === 'Maize') {
    varietyItem = 'DKC-7074';
    recipeItem = 'RCP-MAI-001';
  } else if (cropsItem === 'Pulses') {
    varietyItem = 'JG-11';
    recipeItem = 'RCP-PUL-001';
  }

  batches.push({
    id: `BT-2026-10${i + 10}`,
    sourceLots: [`LOT-GEN-2026-0${i + 10}`],
    crop: cropsItem,
    variety: varietyItem,
    plant: plantItem,
    inputQuantity: 4000 + i * 200,
    currentStage: i % 6 === 0 ? 'Completed' : (i % 5 === 0 ? 'Planned' : 'Drying'),
    progress: i % 6 === 0 ? 100 : (i % 5 === 0 ? 0 : 50),
    startedDate: `2026-05-${String(i).padStart(2, '0')}T08:00:00Z`,
    expectedCompletion: `2026-05-${String(i + 2).padStart(2, '0')}T17:00:00Z`,
    recipeId: recipeItem,
    targetGrade: i % 3 === 0 ? 'Foundation Seed' : 'Certified Seed',
    operator: `Operator ${i}`,
    status: i % 6 === 0 ? 'Completed' : (i % 5 === 0 ? 'Planned' : 'In Progress'),
    stageHistory: [],
    qualityCheckpoints: {},
    labResults: [],
    losses: {
      cleaning: 100,
      drying: 50,
      grading: 150,
      treatment: 10,
      rejected: 0,
    },
  });
}
export { batches as default };
