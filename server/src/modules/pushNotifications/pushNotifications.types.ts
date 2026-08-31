export interface RegisterDeviceTokenInput {
  expoPushToken: string;
  platform?: string;
}

export interface DeviceTokenRow {
  id: string;
  user_email: string;
  expo_push_token: string;
  platform: string | null;
  created_at: string;
  updated_at: string;
}
