import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { TrackerService } from "~/services/tracker.service";
import { getErrorMessage } from "~/utils";
import {
  primaryMetric,
  formatMetric,
  detectOrgClashes,
} from "~/utils/tracker-metric";
import type { DateRange, RangePresetId } from "~/utils/date-range";
import type {
  ProviderGroup,
  Tracker,
  TrackerCreatePayload,
} from "~/types/tracker.types";

interface Period {
  range: DateRange;
  presetId: RangePresetId | null;
  isLifetime: boolean;
}

const groupByProvider = (
  trackers: Tracker[],
  period: Period,
): ProviderGroup[] => {
  const map = new Map<string, Tracker[]>();
  for (const t of trackers) {
    const list = map.get(t.provider) ?? [];
    list.push(t);
    map.set(t.provider, list);
  }
  return Array.from(map.entries())
    .map(([provider, accounts]) => {
      const distinctOrgs = new Set(
        accounts.map((a) => a.account_ref ?? a.key_last4),
      ).size;
      const primary = accounts.map((a) => primaryMetric(a));
      const isMoney = period.isLifetime
        ? primary[0]?.isMoney ?? true
        : accounts[0]?.is_money ?? true;
      const total = period.isLifetime
        ? primary.reduce((s, p) => s + (p.value ?? 0), 0)
        : accounts.reduce((s, a) => s + (a.window_spend ?? 0), 0);
      return {
        provider,
        accounts,
        totalCost: total,
        metricLabel: period.isLifetime
          ? primary[0]?.label ?? "No data yet"
          : period.range.label,
        metricValue: formatMetric(total, isMoney),
        distinctOrgs,
        hasError: accounts.some((a) => a.status === "error"),
        orgClashIds: detectOrgClashes(accounts),
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);
};

export function useTrackers(period: Period) {
  const { authFetch } = useAuthContext();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const query = period.isLifetime
    ? undefined
    : { from: period.range.from, to: period.range.to };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await TrackerService.list(authFetch, query);
      setTrackers(data.trackers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch, query?.from, query?.to, period.isLifetime]);

  const create = useCallback(
    async (payload: TrackerCreatePayload) => {
      setIsSubmitting(true);
      try {
        const data = await TrackerService.create(authFetch, payload);
        const sameProvider = trackers.filter(
          (t) => t.provider === payload.provider,
        );
        if (sameProvider.length > 0) {
          toast.success(
            "Connected. This account is added to your existing provider total.",
          );
        } else {
          toast.success(data.message);
        }
        await fetchAll();
        return data.tracker;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [authFetch, fetchAll, trackers],
  );

  const updateKey = useCallback(
    async (id: string, apiKey: string) => {
      try {
        const data = await TrackerService.updateKey(authFetch, id, apiKey);
        toast.success(data.message);
        await fetchAll();
        return data.tracker;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [authFetch, fetchAll],
  );

  const disconnect = useCallback(
    async (id: string) => {
      try {
        await TrackerService.disconnect(authFetch, id);
        toast.success("Tracker disconnected");
        await fetchAll();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [authFetch, fetchAll],
  );

  const sync = useCallback(
    async (id: string) => {
      setSyncingId(id);
      try {
        const data = await TrackerService.sync(authFetch, id);
        if (data.success) toast.success("Refreshed from provider");
        else toast.error(data.message || "Refresh failed");
        await fetchAll();
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setSyncingId(null);
      }
    },
    [authFetch, fetchAll],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const groups = useMemo(
    () => groupByProvider(trackers, period),
    [trackers, period.isLifetime, period.range.label],
  );

  return {
    trackers,
    groups,
    loading,
    error,
    isSubmitting,
    syncingId,
    fetchAll,
    create,
    updateKey,
    disconnect,
    sync,
  };
}
