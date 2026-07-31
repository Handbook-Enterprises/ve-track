import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { IdentityKeyService } from "~/services/identity-key.service";
import { getErrorMessage } from "~/utils";
import type {
  IdentityKeyCreatePayload,
  IdentityKeyEntry,
} from "~/types/identity-key.types";

export function useIdentityKeys() {
  const { authFetch } = useAuthContext();
  const [identityKeys, setIdentityKeys] = useState<IdentityKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await IdentityKeyService.list(authFetch);
      setIdentityKeys(data.identityKeys);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const create = useCallback(
    async (payload: IdentityKeyCreatePayload) => {
      setIsSubmitting(true);
      try {
        const data = await IdentityKeyService.create(authFetch, payload);
        toast.success(data.message);
        await fetchAll();
        return data.identityKey;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [authFetch, fetchAll],
  );

  const updateKey = useCallback(
    async (id: string, apiKey: string) => {
      try {
        const data = await IdentityKeyService.updateKey(authFetch, id, apiKey);
        toast.success(data.message);
        await fetchAll();
        return data.identityKey;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [authFetch, fetchAll],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        const data = await IdentityKeyService.remove(authFetch, id);
        toast.success(data.message);
        await fetchAll();
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [authFetch, fetchAll],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    identityKeys,
    loading,
    error,
    isSubmitting,
    fetchAll,
    create,
    updateKey,
    remove,
  };
}
