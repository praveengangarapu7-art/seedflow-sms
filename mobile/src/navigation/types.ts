export type RootStackParamList = {
  Tabs: undefined;
  SeedLotDetail: { seedLotId: string };
  InspectionForm: { seedLotId: string; lotCode: string };
};

export type TabParamList = {
  Home: undefined;
  SeedLots: undefined;
  Varieties: undefined;
  SyncQueue: undefined;
};
