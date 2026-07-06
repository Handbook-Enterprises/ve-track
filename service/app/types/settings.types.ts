export interface TenantSettings {
  models_friendly_names: boolean;
  credit_price_usd: number | null;
}

export type SettingKey = keyof TenantSettings;

export interface SettingsResponse {
  success: boolean;
  settings: TenantSettings;
}
