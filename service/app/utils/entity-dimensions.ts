import { Activity, Building2, Cpu, Layers, Tag, User2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { providerLabel } from "./providers";
import type {
  UsageGroup,
  UsageOverview,
  UsageQueryFilters,
} from "~/types/usage.types";

export const NULL_FILTER = "__none__";

export type DimensionId =
  | "provider"
  | "model"
  | "app"
  | "people"
  | "org"
  | "action";

export type EntityId =
  | "provider"
  | "model"
  | "app"
  | "people"
  | "org"
  | "action";

export interface DimensionDef {
  id: DimensionId;
  tabLabel: string;
  pick: (o: UsageOverview) => UsageGroup[];
  variant: "plain" | "identity";
  label: (g: UsageGroup) => string;
  emptyLabel: string;
  fallbackLabel: string;
  untrackedNoun: string;
  filterKey?: keyof UsageQueryFilters;
  nullable?: boolean;
}

export interface EntityConfig extends DimensionDef {
  id: EntityId;
  navLabel: string;
  noun: string;
  nounPlural: string;
  route: string;
  icon: LucideIcon;
  filterKey: keyof UsageQueryFilters;
  related: DimensionId[];
}

export const DIMENSIONS: Record<DimensionId, DimensionDef> = {
  provider: {
    id: "provider",
    untrackedNoun: "provider",
    tabLabel: "Providers",
    pick: (o) => o.byProvider,
    variant: "plain",
    label: (g) => providerLabel(g.key),
    emptyLabel: "Unknown",
    fallbackLabel: "Unknown",
    filterKey: "provider",
  },
  model: {
    id: "model",
    untrackedNoun: "model",
    tabLabel: "Models",
    pick: (o) => o.byModel,
    variant: "plain",
    label: (g) => g.name ?? g.key ?? "Unknown",
    emptyLabel: "Unknown",
    fallbackLabel: "Unknown",
    filterKey: "model",
    nullable: true,
  },
  app: {
    id: "app",
    untrackedNoun: "app",
    tabLabel: "Apps",
    pick: (o) => o.byApp,
    variant: "plain",
    label: (g) => g.name ?? g.key ?? "Unattributed",
    emptyLabel: "Unattributed",
    fallbackLabel: "Unattributed",
    filterKey: "app",
  },
  people: {
    id: "people",
    untrackedNoun: "person",
    tabLabel: "People",
    pick: (o) => o.byUser,
    variant: "identity",
    label: (g) => g.name ?? g.key ?? "Anonymous",
    emptyLabel: "Anonymous",
    fallbackLabel: "Anonymous",
    filterKey: "clerk_user_id",
    nullable: true,
  },
  org: {
    id: "org",
    untrackedNoun: "organization",
    tabLabel: "Organizations",
    pick: (o) => o.byOrg,
    variant: "identity",
    label: (g) => g.name ?? g.key ?? "Personal / no org",
    emptyLabel: "Personal / no org",
    fallbackLabel: "Personal / no org",
    filterKey: "clerk_org_id",
    nullable: true,
  },
  action: {
    id: "action",
    untrackedNoun: "action",
    tabLabel: "Actions",
    pick: (o) => o.byAction,
    variant: "plain",
    label: (g) => g.name ?? g.key ?? "Untagged",
    emptyLabel: "Untagged",
    fallbackLabel: "Untagged",
    filterKey: "action",
    nullable: true,
  },
};

export const ENTITIES: Record<EntityId, EntityConfig> = {
  provider: {
    ...(DIMENSIONS.provider as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "provider",
    navLabel: "Providers",
    noun: "provider",
    nounPlural: "providers",
    route: "/dashboard/usage",
    icon: Activity,
    related: ["model", "action", "app", "people", "org"],
  },
  model: {
    ...(DIMENSIONS.model as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "model",
    navLabel: "Models",
    noun: "model",
    nounPlural: "models",
    route: "/dashboard/models",
    icon: Cpu,
    related: ["provider", "action", "app", "people", "org"],
  },
  app: {
    ...(DIMENSIONS.app as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "app",
    navLabel: "Apps",
    noun: "app",
    nounPlural: "apps",
    route: "/dashboard/apps",
    icon: Layers,
    related: ["model", "provider", "action", "people", "org"],
  },
  people: {
    ...(DIMENSIONS.people as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "people",
    navLabel: "People",
    noun: "person",
    nounPlural: "people",
    route: "/dashboard/people",
    icon: User2,
    related: ["app", "model", "provider", "action", "org"],
  },
  org: {
    ...(DIMENSIONS.org as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "org",
    navLabel: "Organizations",
    noun: "organization",
    nounPlural: "organizations",
    route: "/dashboard/orgs",
    icon: Building2,
    related: ["app", "model", "provider", "action", "people"],
  },
  action: {
    ...(DIMENSIONS.action as DimensionDef & { filterKey: keyof UsageQueryFilters }),
    id: "action",
    navLabel: "Actions",
    noun: "action",
    nounPlural: "actions",
    route: "/dashboard/actions",
    icon: Tag,
    related: ["provider", "model", "app", "people", "org"],
  },
};

export const ENTITY_LIST: EntityConfig[] = [
  ENTITIES.provider,
  ENTITIES.model,
  ENTITIES.app,
  ENTITIES.people,
  ENTITIES.org,
  ENTITIES.action,
];

export const isEntityId = (id: DimensionId): id is EntityId =>
  id === "provider" ||
  id === "model" ||
  id === "app" ||
  id === "people" ||
  id === "org" ||
  id === "action";
