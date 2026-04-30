import { format } from "date-fns";
import { KeyRound, ShieldOff, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { LoadingElement, ButtonElement } from "~/components/elements";
import ApiKeyForm from "~/components/api-key/ApiKeyForm";
import ApiKeyRevealDialog from "~/components/api-key/ApiKeyRevealDialog";
import { useApiKeys } from "~/hooks/useApiKeys";
import { cn } from "~/lib/utils";
import type { ApiKey } from "~/types/api-key.types";

export default function KeysPage() {
  const {
    apiKeys,
    loading,
    error,
    isSubmitting,
    revealedKey,
    setRevealedKey,
    create,
    revoke,
  } = useApiKeys();

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b-2 border-foreground pb-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          ve-track · API keys
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-tight">
          Keys
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Issue per-app keys, rotate them, revoke when they leak. Each key is
          scoped to this tenant and can't read another tenant's data.
        </p>
      </header>

      <section className="border bg-card p-6">
        <ApiKeyForm onSubmit={create} loading={isSubmitting} />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              /01 · Active keys
            </p>
            <h2 className="mt-1 text-lg font-medium">
              {apiKeys.filter((k) => !k.revoked_at).length} live ·{" "}
              {apiKeys.filter((k) => k.revoked_at).length} revoked
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingElement size={24} />
          </div>
        ) : error ? (
          <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : apiKeys.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="border bg-card">
            <div className="grid grid-cols-[1fr_10rem_8rem_4rem] items-center gap-3 border-b px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Name</span>
              <span>Prefix</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>
            {apiKeys.map((key) => (
              <KeyRow key={key.id} apiKey={key} onRevoke={revoke} />
            ))}
          </div>
        )}
      </section>

      <ApiKeyRevealDialog
        apiKey={revealedKey}
        onClose={() => setRevealedKey(null)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-card p-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-4 text-sm font-medium">No keys yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        Create your first key above. Drop it in your app's env as VE_TRACK_KEY,
        wrap your worker handler, and you're tracking.
      </p>
    </div>
  );
}

function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: (id: string) => Promise<void>;
}) {
  const revoked = !!apiKey.revoked_at;
  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_10rem_8rem_4rem] items-center gap-3 border-b px-4 py-3 last:border-b-0",
        revoked && "opacity-50",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{apiKey.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {revoked ? "Revoked" : "Active"}
        </p>
      </div>
      <span className="font-mono text-xs">{apiKey.prefix}…</span>
      <span className="text-xs text-muted-foreground">
        {format(new Date(apiKey.created_at), "MMM d, yyyy")}
      </span>
      <div className="flex justify-end">
        {revoked ? (
          <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <ButtonElement
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ButtonElement>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apps using <span className="font-mono">{apiKey.prefix}…</span>{" "}
                  will stop ingesting events immediately. This can't be
                  undone — issue a new key first if you're rotating.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRevoke(apiKey.id)}>
                  Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
