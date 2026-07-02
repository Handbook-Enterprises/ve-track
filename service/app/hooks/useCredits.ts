import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "~/context/AuthContext";
import { CreditService } from "~/services/credit.service";
import { getErrorMessage } from "~/utils";
import type { CreditQueryFilters, CreditSummary } from "~/types/credit.types";

const EMPTY_SUMMARY: CreditSummary = {
  fromDays: 7,
  totals: {
    credits: 0,
    revenue_usd: 0,
    cost_usd: 0,
    margin_usd: 0,
    margin_pct: null,
    charges: 0,
    fromDays: 7,
  },
  byApp: [],
  byAction: [],
  byOrg: [],
  byUser: [],
  series: [],
};

export function useCredits(initial?: CreditQueryFilters) {
  const { authFetch } = useAuthContext();
  const [filters, setFilters] = useState<CreditQueryFilters>(
    initial ?? { fromDays: 7 },
  );
  const [summary, setSummary] = useState<CreditSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CreditService.getSummary(authFetch, filters);
      setSummary(data.summary);
    } catch (err) {
      console.error("[ve-track][useCredits] summary fetch failed", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    filters,
    setFilters,
    loading,
    error,
    refetch: fetchSummary,
  };
}
