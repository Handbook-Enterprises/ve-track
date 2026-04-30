import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "./AuthContext";
import { handleApiResponse } from "~/utils";

export interface TenantInfo {
  id: string;
  name: string;
  clerk_org_id: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

interface MeResponse {
  success: boolean;
  tenant: TenantInfo;
  clerkUserId: string;
  clerkOrgId: string;
}

interface TenantContextType {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, organizationId, authFetch } = useAuthContext();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setTenant(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/dashboard/me");
      const data = await handleApiResponse<MeResponse>(res);
      setTenant(data.tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant");
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, isSignedIn, organizationId]);

  useEffect(() => {
    if (!isLoaded) return;
    refresh();
  }, [isLoaded, refresh]);

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenantContext must be used within a TenantProvider");
  }
  return ctx;
}
