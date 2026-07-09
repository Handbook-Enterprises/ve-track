import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ButtonElement } from "~/components/elements";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: UsageGroup | null;
  onSubmit: (slug: string, name: string) => Promise<boolean>;
}

export default function RenameActionDialog({
  open,
  onOpenChange,
  action,
  onSubmit,
}: Props) {
  const slug = action?.key ?? "";
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setName(action?.name ?? action?.key ?? "");
  }, [open, action?.key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!slug || !trimmed) return;
    setSubmitting(true);
    const ok = await onSubmit(slug, trimmed);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Rename this action</DialogTitle>
          <DialogDescription>
            Pick a name your team recognizes. Apps keep sending the original
            slug and every report simply shows the new name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Display name
            </label>
            <Input
              autoFocus
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Query fan out"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Slug
            </label>
            <div className="flex items-center justify-between border border-foreground/15 bg-muted/40 px-3 py-2">
              <span className="truncate font-mono text-[12.5px] text-muted-foreground">
                {slug}
              </span>
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The slug is the permanent id your code sends. It never changes.
            </p>
          </div>

          <DialogFooter>
            <ButtonElement
              type="submit"
              loading={submitting}
              className="w-full"
              disabled={!name.trim() || !slug}
            >
              Save display name
            </ButtonElement>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
