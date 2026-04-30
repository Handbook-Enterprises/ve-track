import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ButtonElement } from "~/components/elements";
import type { ApiKeyWithSecret } from "~/types/api-key.types";

interface Props {
  apiKey: ApiKeyWithSecret | null;
  onClose: () => void;
}

export default function ApiKeyRevealDialog({ apiKey, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey.fullKey);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <Dialog open={!!apiKey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save your API key</DialogTitle>
          <DialogDescription>
            This is the only time we'll show the full key. Copy it into your
            secret store now — we keep only a hash from this point on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 border bg-muted/30 p-3 font-mono text-xs break-all">
            <span className="flex-1">{apiKey?.fullKey}</span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Label · {apiKey?.name}
          </p>
        </div>

        <DialogFooter>
          <ButtonElement variant="outline" onClick={onClose}>
            I've stored it
          </ButtonElement>
          <ButtonElement onClick={copy}>
            {copied ? (
              <Check className="mr-2 h-3.5 w-3.5" />
            ) : (
              <Copy className="mr-2 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </ButtonElement>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
