import { useCallback, useEffect, useState } from "react";
import { useAuthContext } from "~/context/AuthContext";

export function useUserFlag(name: string) {
  const { userId } = useAuthContext();
  const key = userId ? `ve-track-${name}:user:${userId}` : `ve-track-${name}`;

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
