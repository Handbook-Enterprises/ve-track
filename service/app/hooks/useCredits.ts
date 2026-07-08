import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "~/context/AuthContext";
import { CreditsService } from "~/services/credits.service";
import { getErrorMessage } from "~/utils";
import type { CreditsOverview } from "~/types/credits.types";
import type { UsageQueryFilters } from "~/types/usage.types";

const EMPTY_CREDITS: CreditsOverview = {
  fromDays: 7,
  creditPriceUsd: null,
  totals: {
    revenue_usd: 0,
    cost_usd: 0,
    margin_usd: 0,
    margin_pct: null,
    credits_charged: 0,
    requests: 0,
    fromDays: 7,
  },
  series: [],
  byApp: [],
  byAction: [],
  byUser: [],
  byOrg: [],
  byProvider: [],
  byModel: [],
};

export function useCredits(initial?: UsageQueryFilters) {
  const { authFetch } = useAuthContext();
  const [filters, setFilters] = useState<UsageQueryFilters>(
    initial ?? { fromDays: 7 },
  );
  const [credits, setCredits] = useState<CreditsOverview>(EMPTY_CREDITS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CreditsService.getOverview(authFetch, filters);
      setCredits(data.credits);
    } catch (err) {
      console.error("[ve-track][useCredits] credits fetch failed", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    filters,
    setFilters,
    loading,
    error,
    refetch: fetchCredits,
  };
}
