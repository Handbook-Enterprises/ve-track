import { useEffect, useState } from "react";
import { ArrowRight, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { ButtonElement } from "~/components/elements";
import { formatMoney, formatNumber } from "~/utils/format";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: UsageGroup | null;
  candidates: UsageGroup[];
  onSubmit: (from: string, into: string) => Promise<boolean>;
}

const actionLabel = (g: UsageGroup) => g.name ?? g.key ?? "Untagged";

export default function MergeActionDialog({
  open,
  onOpenChange,
  source,
  candidates,
  onSubmit,
}: Props) {
  const [target, setTarget] = useState<UsageGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setTarget(null);
  }, [open, source?.key]);

  const from = source?.key ?? "";
  const options = candidates.filter((g) => g.key && g.key !== from);

  const handleConfirm = async () => {
    if (!from || !target?.key) return;
    setSubmitting(true);
    const ok = await onSubmit(from, target.key);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            Merge {source ? actionLabel(source) : "action"} into another action
          </DialogTitle>
          <DialogDescription>
            Use this when the action name changed in code and the history split
            in two. All spend, calls, and credits move to the action you pick.
          </DialogDescription>
        </DialogHeader>

        {target == null ? (
          <Command className="border border-foreground/15">
            <CommandInput placeholder="Search actions…" />
            <CommandList>
              <CommandEmpty>No other actions found.</CommandEmpty>
              <CommandGroup>
                {options.map((g) => (
                  <CommandItem
                    key={g.key}
                    value={`${g.name ?? ""} ${g.key}`}
                    onSelect={() => setTarget(g)}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">
                        {actionLabel(g)}
                      </span>
                      {g.name && g.name !== g.key ? (
                        <span className="block truncate font-mono text-[10.5px] text-muted-foreground">
                          {g.key}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatNumber(g.requests)} calls · {formatMoney(g.cost_usd)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 border border-foreground/15 bg-muted/40 px-4 py-3">
              <span className="min-w-0 truncate font-mono text-[12.5px]">
                {from}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 truncate font-mono text-[12.5px] font-semibold">
                {target.key}
              </span>
            </div>

            <div className="space-y-1.5 border border-destructive/30 bg-destructive/[0.04] px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" />
                This rewrites history and cannot be undone
              </p>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {source
                  ? `${formatNumber(source.requests)} calls and ${formatMoney(source.cost_usd)} recorded as ${actionLabel(source)} move into ${actionLabel(target)}.`
                  : ""}{" "}
                Future events your apps send as{" "}
                <span className="font-mono">{from}</span> are recorded as{" "}
                <span className="font-mono">{target.key}</span> automatically.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <ButtonElement
                type="button"
                variant="outline"
                onClick={() => setTarget(null)}
                disabled={submitting}
              >
                Pick another action
              </ButtonElement>
              <ButtonElement
                type="button"
                variant="destructive"
                loading={submitting}
                onClick={handleConfirm}
              >
                Merge the history
              </ButtonElement>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
