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
import DataForSeoAuthFields from "./DataForSeoAuthFields";
import ZyteAuthFields from "./ZyteAuthFields";
import CloudflareAuthFields from "./CloudflareAuthFields";
import { providerLabel } from "~/utils/providers";
import type { Tracker } from "~/types/tracker.types";

const PLACEHOLDERS: Record<string, string> = {
  openai: "sk-admin-…",
  anthropic: "sk-ant-admin-…",
  openrouter: "sk-or-v1-…",
  apify: "apify_api_…",
  dataforseo: "API key or login:password",
  zyte: "apiKey:organizationId",
  fal: "Paste your fal admin key",
  firecrawl: "fc-…",
  cloudflare: "apiToken:accountId",
};

interface Props {
  account: Tracker;
  onSubmit: (id: string, apiKey: string) => Promise<unknown>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EditKeyDialog({
  account,
  onSubmit,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setUncontrolledOpen(next);
  };
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDfo = account.provider === "dataforseo";
  const isZyte = account.provider === "zyte";
  const isCloudflare = account.provider === "cloudflare";
  const isComposite = isDfo || isZyte || isCloudflare;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim().length < 8) return;
    setSubmitting(true);
    try {
      await onSubmit(account.id, apiKey.trim());
      setApiKey("");
      setOpen(false);
    } catch {
      // surfaced via toast in the hook
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
      {isControlled ? null : (
        <DialogTrigger asChild>
          <ButtonElement
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Update key"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </ButtonElement>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Update the {providerLabel(account.provider)} key</DialogTitle>
          <DialogDescription>
            Paste a fresh key for{" "}
            <span className="font-mono">
              {account.account_ref ?? `account ····${account.key_last4}`}
            </span>
            . Use this when the provider revoked, rotated, or expired the old one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {isComposite ? "New authentication" : "New API key"}
            </label>
            {isDfo ? (
              <DataForSeoAuthFields autoFocus hideHint onChange={setApiKey} />
            ) : isZyte ? (
              <ZyteAuthFields autoFocus hideHint onChange={setApiKey} />
            ) : isCloudflare ? (
              <CloudflareAuthFields autoFocus hideHint onChange={setApiKey} />
            ) : (
              <Input
                autoFocus
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={PLACEHOLDERS[account.provider] ?? "Paste your key"}
              />
            )}
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-[#fd5200]" />
              We re-check it with the provider, then encrypt it. The current key
              stays until the new one validates.
            </p>
          </div>

          <DialogFooter>
            <ButtonElement
              type="submit"
              loading={submitting}
              className="w-full"
              disabled={apiKey.trim().length < 8}
            >
              Update and pull cost
            </ButtonElement>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
