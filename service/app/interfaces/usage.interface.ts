import type { UsageDimension } from "~/types/usage.types";

export interface UsageTabDefinition {
  key: UsageDimension;
  number: string;
  label: string;
  emptyKey: string;
}
