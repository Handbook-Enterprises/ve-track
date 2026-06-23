export interface TenantSettings {
  models_friendly_names: boolean;
}

export type SettingKey = keyof TenantSettings;

export interface SettingsResponse {
  success: boolean;
  settings: TenantSettings;
}
