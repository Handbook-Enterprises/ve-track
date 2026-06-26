import { useCallback, useEffect, useState } from "react";
import { useTenantContext } from "~/context/TenantContext";

export function useTenantFlag(name: string) {
  const { tenant } = useTenantContext();
  const tenantId = tenant?.id ?? null;
  const key = tenantId ? `ve-track-${name}:${tenantId}` : `ve-track-${name}`;

  const [value, setValue] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setValue(localStorage.getItem(key) === "1");
  }, [key]);

  const setFlag = useCallback(
    (next: boolean) => {
      if (typeof window !== "undefined") {
        if (next) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      }
      setValue(next);
    },
    [key],
  );

  return [value, setFlag] as const;
}
