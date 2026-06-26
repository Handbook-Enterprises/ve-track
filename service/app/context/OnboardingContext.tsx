import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTenantContext } from "~/context/TenantContext";

interface OnboardingContextType {
  open: boolean;
  hasSeen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  markSeen: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

const KEY_PREFIX = "ve-track-onboarding-seen";

const storageKey = (tenantId: string | null | undefined) =>
  tenantId ? `${KEY_PREFIX}:${tenantId}` : KEY_PREFIX;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenantContext();
  const tenantId = tenant?.id ?? null;

  const [open, setOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasSeen(localStorage.getItem(storageKey(tenantId)) === "1");
  }, [tenantId]);

  const markSeen = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey(tenantId), "1");
    }
    setHasSeen(true);
  }, [tenantId]);

  const openOnboarding = useCallback(() => setOpen(true), []);

  const closeOnboarding = useCallback(() => {
    setOpen(false);
    markSeen();
  }, [markSeen]);

  const value = useMemo(
    () => ({ open, hasSeen, openOnboarding, closeOnboarding, markSeen }),
    [open, hasSeen, openOnboarding, closeOnboarding, markSeen],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined)
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  return context;
}
