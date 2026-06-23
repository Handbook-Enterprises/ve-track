import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Input } from "~/components/ui/input";

interface Props {
  onChange: (value: string) => void;
  autoFocus?: boolean;
  hideHint?: boolean;
}

export default function CloudflareAuthFields({
  onChange,
  autoFocus,
  hideHint,
}: Props) {
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");

  const sync = (nextToken: string, nextAccount: string) => {
    const t = nextToken.trim();
    const a = nextAccount.trim();
    onChange(t && a ? `${t}:${a}` : "");
  };

  return (
    <div className="space-y-2">
      <Input
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="API token with billing read access"
        value={token}
        onChange={(e) => {
          setToken(e.target.value);
          sync(e.target.value, accountId);
        }}
      />
      <Input
        autoComplete="off"
        placeholder="Account ID"
        value={accountId}
        onChange={(e) => {
          setAccountId(e.target.value);
          sync(token, e.target.value);
        }}
      />
      {hideHint ? null : (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#fd5200]" />
          <span>
            Use an API token with billing read access. Your account ID is in the
            dashboard URL: dash.cloudflare.com/&lt;accountId&gt;. Cost data needs
            the account enrolled in the PayGo usage alpha.
          </span>
        </p>
      )}
    </div>
  );
}
