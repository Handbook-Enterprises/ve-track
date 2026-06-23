import { Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SettingKey } from "~/types/settings.types";

export interface SettingDef {
  key: SettingKey;
  label: string;
  description: string;
}

export interface SettingsGroup {
  entity: string;
  icon: LucideIcon;
  settings: SettingDef[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    entity: "Models",
    icon: Cpu,
    settings: [
      {
        key: "models_friendly_names",
        label: "Friendly model names",
        description:
          "Show model display names from your Models registry instead of raw model ids across usage.",
      },
    ],
  },
];
