import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "~/context/AuthContext";
import { SettingsService } from "~/services/settings.service";
import { getErrorMessage } from "~/utils";
import type { SettingKey, TenantSettings } from "~/types/settings.types";

const DEFAULTS: TenantSettings = {
  models_friendly_names: false,
};

export function useSettings() {
  const { authFetch } = useAuthContext();
  const [settings, setSettings] = useState<TenantSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SettingKey | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SettingsService.get(authFetch);
      setSettings(data.settings);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggle = useCallback(
    async (key: SettingKey, value: boolean) => {
      const previous = settings[key];
      setSettings((s) => ({ ...s, [key]: value }));
      setSaving(key);
      try {
        const data = await SettingsService.update(authFetch, { [key]: value });
        setSettings(data.settings);
      } catch (err) {
        setSettings((s) => ({ ...s, [key]: previous }));
        setError(getErrorMessage(err));
      } finally {
        setSaving(null);
      }
    },
    [authFetch, settings],
  );

  return { settings, loading, error, saving, toggle, refetch: fetchSettings };
}
