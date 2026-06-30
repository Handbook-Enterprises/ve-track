import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "~/context/AuthContext";

type Flags = Record<string, boolean>;

interface Stored {
  baseline: string[];
  completed: string[];
}

function read(key: string): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.baseline) || !Array.isArray(parsed.completed))
      return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(key: string, value: Stored) {
  if (typeof window !== "undefined")
    localStorage.setItem(key, JSON.stringify(value));
}

export function useUserChecklist(
  storageKey: string,
  conditions: Flags,
  ready: boolean,
): Flags {
  const { userId } = useAuthContext();
  const key = userId
    ? `ve-track-${storageKey}:user:${userId}`
    : `ve-track-${storageKey}`;

  const signature = useMemo(
    () =>
      Object.keys(conditions)
        .sort()
        .map((k) => `${k}:${conditions[k] ? 1 : 0}`)
        .join("|"),
    [conditions],
  );

  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!ready) return;
    const trueKeys = Object.keys(conditions).filter((k) => conditions[k]);
    const stored = read(key);

    if (!stored) {
      write(key, { baseline: trueKeys, completed: [] });
      setCompleted([]);
      return;
    }

    const earned = trueKeys.filter(
      (k) => !stored.baseline.includes(k) && !stored.completed.includes(k),
    );
    const next = earned.length
      ? [...stored.completed, ...earned]
      : stored.completed;
    if (earned.length) write(key, { ...stored, completed: next });
    setCompleted(next);
  }, [key, ready, signature]);

  return useMemo(() => {
    const done: Flags = {};
    for (const k of Object.keys(conditions)) done[k] = completed.includes(k);
    return done;
  }, [signature, completed]);
}
