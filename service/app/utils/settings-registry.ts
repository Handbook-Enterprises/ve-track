import { Coins, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SettingKey } from "~/types/settings.types";

export type SettingControl = "switch" | "price";

export interface SettingDef {
  key: SettingKey;
  label: string;
  description: string;
  control: SettingControl;
}

export interface SettingsGroup {
  entity: string;
  icon: LucideIcon;
  settings: SettingDef[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    entity: "Credits",
    icon: Coins,
    settings: [
      {
        key: "credit_price_usd",
        label: "Default credit price",
        description:
          "The USD value of one credit, applied to every credit event from all your apps that do not send their own price. An app with unique pricing can pass creditPriceUsd in trackCredits or trackUsage to override this for its events. Leave empty and unpriced credits count as zero revenue.",
        control: "price",
      },
    ],
  },
  {
    entity: "Models",
    icon: Cpu,
    settings: [
      {
        key: "models_friendly_names",
        label: "Friendly model names",
        description:
          "Show model display names from your Models registry instead of raw model ids across usage.",
        control: "switch",
      },
    ],
  },
];
