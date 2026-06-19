import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { CostTrackerService } from "~/services/cost-tracker.service";
import { getErrorMessage } from "~/utils";
import type {
  CostTracker,
  CostTrackerCreatePayload,
} from "~/types/cost-tracker.types";

export function useCostTrackers() {
  const { authFetch } = useAuthContext();
  const [trackers, setTrackers] = useState<CostTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CostTrackerService.list(authFetch);
      setTrackers(data.trackers);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const create = useCallback(
    async (payload: CostTrackerCreatePayload) => {
      setIsSubmitting(true);
      try {
        const data = await CostTrackerService.create(authFetch, payload);
        toast.success(data.message);
        await fetchAll();
        return data.tracker;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [authFetch, fetchAll],
  );

  const disconnect = useCallback(
    async (id: string) => {
      try {
        await CostTrackerService.disconnect(authFetch, id);
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
        const data = await CostTrackerService.sync(authFetch, id);
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

  return {
    trackers,
    loading,
    error,
    isSubmitting,
    syncingId,
    fetchAll,
    create,
    disconnect,
    sync,
  };
}
