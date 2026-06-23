import { AlertTriangle, RefreshCw } from "lucide-react";
import { useSettings } from "~/hooks/useSettings";
import { LoadingElement, ButtonElement } from "~/components/elements";
import { Switch } from "~/components/ui/switch";
import { SETTINGS_GROUPS, type SettingDef } from "~/utils/settings-registry";
import type { SettingKey, TenantSettings } from "~/types/settings.types";

function SettingRow({
  setting,
  checked,
  busy,
  isLast,
  onToggle,
}: {
  setting: SettingDef;
  checked: boolean;
  busy: boolean;
  isLast: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-6 px-5 py-4 ${
        isLast ? "" : "border-b border-foreground/10"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold leading-tight">
          {setting.label}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          {setting.description}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={busy}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { settings, loading, error, saving, toggle, refetch } = useSettings();

  const groups = SETTINGS_GROUPS.filter((g) => g.settings.length > 0);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <LoadingElement size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center border border-destructive/30">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {error}
        </p>
        <ButtonElement variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Try again
        </ButtonElement>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-foreground/15 pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
          Settings
        </h1>
        <p className="mt-3 max-w-xl text-[13px] text-muted-foreground">
          Preferences for how each entity behaves across your dashboard. Changes
          apply to everyone in this tenant.
        </p>
      </header>

      <div className="max-w-2xl space-y-8">
        {groups.map((group) => (
          <section key={group.entity}>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center bg-primary/10 text-primary">
                <group.icon className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.entity}
              </h2>
            </div>
            <div className="border border-foreground/15 bg-card">
              {group.settings.map((setting, i) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  checked={settings[setting.key as SettingKey]}
                  busy={saving === setting.key}
                  isLast={i === group.settings.length - 1}
                  onToggle={(value) =>
                    toggle(setting.key as keyof TenantSettings, value)
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
