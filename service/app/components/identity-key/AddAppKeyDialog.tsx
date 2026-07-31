import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ButtonElement } from "~/components/elements";
import type { IdentityKeyCreatePayload } from "~/types/identity-key.types";

interface Props {
  onSubmit: (payload: IdentityKeyCreatePayload) => Promise<unknown>;
  loading?: boolean;
}

export default function AddAppKeyDialog({ onSubmit, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const reset = () => {
    setLabel("");
    setApiKey("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || apiKey.trim().length < 8) return;
    try {
      await onSubmit({ label: label.trim(), apiKey: apiKey.trim() });
      reset();
      setOpen(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <ButtonElement size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add app key
        </ButtonElement>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add an app key</DialogTitle>
          <DialogDescription>
            For apps that use Clerk for auth. Paste the secret key from the
            same Clerk instance your users sign in through (usually sk_live).
            We use it only to turn raw user and organization IDs into names in
            this dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              App name
            </label>
            <Input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VE Radar"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              Clerk secret key
            </label>
            <Input
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_…"
            />
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" />
              We verify it with Clerk, then encrypt it. It is never shown
              again.
            </p>
          </div>

          <DialogFooter>
            <ButtonElement
              type="submit"
              loading={loading}
              className="w-full"
              disabled={!label.trim() || apiKey.trim().length < 8}
            >
              Verify and add
            </ButtonElement>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
