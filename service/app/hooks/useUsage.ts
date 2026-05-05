import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { UsageService } from "~/services/usage.service";
import { getErrorMessage } from "~/utils";
import type { UsageOverview, UsageQueryFilters } from "~/types/usage.types";

const EMPTY_OVERVIEW: UsageOverview = {
  fromDays: 7,
  totals: {
    cost_usd: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    requests: 0,
    fromDays: 7,
  },
  byApp: [],
  byOrg: [],
  byUser: [],
  byProvider: [],
  byModel: [],
};

export function useUsage(initial?: UsageQueryFilters) {
  const { authFetch } = useAuthContext();
  const [filters, setFilters] = useState<UsageQueryFilters>(
    initial ?? { fromDays: 7 },
  );
  const [overview, setOverview] = useState<UsageOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canaryRunning, setCanaryRunning] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UsageService.getOverview(authFetch, filters);
     
      setOverview(data.overview);
    } catch (err) {
      console.error("[ve-track][useUsage] overview fetch failed", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  const runCanary = useCallback(async () => {
    setCanaryRunning(true);
    try {
      const result = await UsageService.runCanary(authFetch);
      if (result.success) {
        toast.success(`Canary ok · ${result.runId.slice(0, 8)}…`);
      } else {
        toast.error(`Canary failed · ${result.runId.slice(0, 8)}…`);
      }
      await fetchOverview();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCanaryRunning(false);
    }
  }, [authFetch, fetchOverview]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    overview,
    filters,
    setFilters,
    loading,
    error,
    canaryRunning,
    refetch: fetchOverview,
    runCanary,
  };
}
