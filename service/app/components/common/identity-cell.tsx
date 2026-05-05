import { cn } from "~/lib/utils";

interface Props {
  name: string | null | undefined;
  secondary: string | null | undefined;
  fallbackId: string | null | undefined;
  fallbackLabel: string;
  imageUrl?: string | null;
  accent?: boolean;
}

const initials = (input: string): string => {
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const truncMid = (s: string, head = 6, tail = 4): string =>
  s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

export default function IdentityCell({
  name,
  secondary,
  fallbackId,
  fallbackLabel,
  imageUrl,
  accent,
}: Props) {
  const displayName = name?.trim() || (fallbackId ? truncMid(fallbackId, 8, 4) : fallbackLabel);
  const showSecondary = secondary || (name && fallbackId ? truncMid(fallbackId, 6, 4) : null);
  const initialsSrc = name?.trim() || fallbackId || fallbackLabel;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={cn(
            "h-8 w-8 shrink-0 border object-cover",
            accent ? "border-primary/40" : "border-foreground/10",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center border font-mono text-[10px] font-medium tracking-wide tabular-nums",
            accent
              ? "border-primary/50 bg-primary/8 text-primary"
              : "border-foreground/15 bg-muted/40 text-muted-foreground",
          )}
        >
          {initials(initialsSrc)}
        </div>
      )}
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "truncate text-[13px] font-medium text-foreground",
            !name && "italic text-muted-foreground",
          )}
        >
          {displayName}
        </p>
        {showSecondary ? (
          <p className="mt-0.5 truncate font-mono text-[10.5px] tracking-tight text-muted-foreground">
            {showSecondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}
