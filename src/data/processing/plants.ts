import { Plant } from '@/types/processing';

export const plants: Plant[] = [
  {
    id: 'PL-AUR',
    name: 'Aurangabad Plant',
    location: 'Aurangabad',
    state: 'Maharashtra',
    manager: 'Mohammed Ismail',
    status: 'Operational',
    activeMachinesCount: 5,
    activeBatchesCount: 9,
    utilizationRate: 82,
  },
  {
    id: 'PL-HYD',
    name: 'Hyderabad Plant',
    location: 'Hyderabad',
    state: 'Telangana',
    manager: 'K. Srinivasan',
    status: 'Operational',
    activeMachinesCount: 4,
    activeBatchesCount: 8,
    utilizationRate: 76,
  },
  {
    id: 'PL-IND',
    name: 'Indore Plant',
    location: 'Indore',
    state: 'Madhya Pradesh',
    manager: 'Rajesh Verma',
    status: 'Limited Capacity',
    activeMachinesCount: 3,
    activeBatchesCount: 7,
    utilizationRate: 68,
  },
];
