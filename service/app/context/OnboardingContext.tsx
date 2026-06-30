import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUserFlag } from "~/hooks/useUserFlag";

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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [hasSeen, setHasSeen] = useUserFlag("onboarding-seen");

  const markSeen = useCallback(() => setHasSeen(true), [setHasSeen]);
  const openOnboarding = useCallback(() => setOpen(true), []);
  const closeOnboarding = useCallback(() => {
    setOpen(false);
    setHasSeen(true);
  }, [setHasSeen]);

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
