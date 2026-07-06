import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { useSettings } from "~/hooks/useSettings";
import { LoadingElement, ButtonElement } from "~/components/elements";
import { Switch } from "~/components/ui/switch";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group";
import { SETTINGS_GROUPS, type SettingDef } from "~/utils/settings-registry";
import type { SettingKey, TenantSettings } from "~/types/settings.types";

function RowShell({
  setting,
  isLast,
  children,
}: {
  setting: SettingDef;
  isLast: boolean;
  children: React.ReactNode;
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
      {children}
    </div>
  );
}

function SwitchRow({
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
    <RowShell setting={setting} isLast={isLast}>
      <Switch
        checked={checked}
        disabled={busy}
        onCheckedChange={onToggle}
        className="mt-0.5 shrink-0"
      />
    </RowShell>
  );
}

function PriceRow({
  setting,
  value,
  busy,
  isLast,
  onSave,
}: {
  setting: SettingDef;
  value: number | null;
  busy: boolean;
  isLast: boolean;
  onSave: (value: number | null) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [justSaved, setJustSaved] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const flash = () => {
    setJustSaved(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setJustSaved(false), 2000);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value != null && (await onSave(null))) flash();
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setDraft(value == null ? "" : String(value));
      return;
    }
    if (parsed === value) {
      setDraft(String(parsed));
      return;
    }
    if (await onSave(parsed)) flash();
  };

  return (
    <RowShell setting={setting} isLast={isLast}>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <InputGroup className="w-52">
          <InputGroupAddon align="inline-start">
            <InputGroupText>$</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            inputMode="decimal"
            placeholder="0.01"
            aria-label={setting.label}
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="text-[11px]">per credit</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <span
          aria-live="polite"
          className={`flex items-center gap-1 text-[11px] text-primary transition-opacity duration-200 ${
            justSaved ? "opacity-100" : "opacity-0"
          }`}
        >
          <Check className="h-3 w-3" />
          Saved
        </span>
      </div>
    </RowShell>
  );
}

export default function SettingsPage() {
  const { settings, loading, error, saving, save, refetch } = useSettings();

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
              {group.settings.map((setting, i) =>
                setting.control === "price" ? (
                  <PriceRow
                    key={setting.key}
                    setting={setting}
                    value={settings[setting.key] as number | null}
                    busy={saving === setting.key}
                    isLast={i === group.settings.length - 1}
                    onSave={(value) =>
                      save(setting.key as "credit_price_usd", value)
                    }
                  />
                ) : (
                  <SwitchRow
                    key={setting.key}
                    setting={setting}
                    checked={settings[setting.key as SettingKey] as boolean}
                    busy={saving === setting.key}
                    isLast={i === group.settings.length - 1}
                    onToggle={(value) =>
                      save(
                        setting.key as keyof Pick<
                          TenantSettings,
                          "models_friendly_names"
                        >,
                        value,
                      )
                    }
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
