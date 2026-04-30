import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { ApiKeyService } from "~/services/api-key.service";
import { getErrorMessage } from "~/utils";
import type { ApiKey, ApiKeyWithSecret } from "~/types/api-key.types";
import type { ApiKeyFormData } from "~/interfaces/api-key.interface";

export function useApiKeys() {
  const { authFetch } = useAuthContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedKey, setRevealedKey] = useState<ApiKeyWithSecret | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiKeyService.list(authFetch);
      setApiKeys(data.apiKeys);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const create = useCallback(
    async (payload: ApiKeyFormData) => {
      setIsSubmitting(true);
      try {
        const data = await ApiKeyService.create(authFetch, payload);
        setRevealedKey(data.apiKey);
        toast.success("Key created. Copy it now — we won't show it again.");
        await fetchAll();
        return data.apiKey;
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [authFetch, fetchAll],
  );

  const revoke = useCallback(
    async (id: string) => {
      try {
        await ApiKeyService.revoke(authFetch, id);
        toast.success("Key revoked");
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
    apiKeys,
    loading,
    error,
    isSubmitting,
    revealedKey,
    setRevealedKey,
    fetchAll,
    create,
    revoke,
  };
}
