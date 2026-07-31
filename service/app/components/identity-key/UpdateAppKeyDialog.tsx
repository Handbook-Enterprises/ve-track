import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
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
import type { IdentityKeyEntry } from "~/types/identity-key.types";

interface Props {
  entry: IdentityKeyEntry;
  onSubmit: (id: string, apiKey: string) => Promise<unknown>;
}

export default function UpdateAppKeyDialog({ entry, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length < 8) return;
    setSubmitting(true);
    try {
      await onSubmit(entry.id, apiKey.trim());
      setApiKey("");
      setOpen(false);
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setApiKey("");
      }}
    >
      <DialogTrigger asChild>
        <ButtonElement
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Rotate key"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </ButtonElement>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Rotate the {entry.label} key</DialogTitle>
          <DialogDescription>
            Paste a fresh Clerk secret key for{" "}
            <span className="font-mono">
              {entry.account_ref ?? `····${entry.key_last4}`}
            </span>
            . Use this after you rotate the key in Clerk.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              New secret key
            </label>
            <Input
              autoFocus
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_live_…"
            />
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" />
              We verify it with Clerk, then encrypt it. The current key stays
              until the new one validates.
            </p>
          </div>

          <DialogFooter>
            <ButtonElement
              type="submit"
              loading={submitting}
              className="w-full"
              disabled={apiKey.trim().length < 8}
            >
              Verify and update
            </ButtonElement>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
