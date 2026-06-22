import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Input } from "~/components/ui/input";

interface Props {
  onChange: (value: string) => void;
  autoFocus?: boolean;
  hideHint?: boolean;
}

export default function ZyteAuthFields({
  onChange,
  autoFocus,
  hideHint,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [orgId, setOrgId] = useState("");

  const sync = (nextKey: string, nextOrg: string) => {
    const key = nextKey.trim();
    const org = nextOrg.trim();
    onChange(key && org ? `${key}:${org}` : "");
  };

  return (
    <div className="space-y-2">
      <Input
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Stats dashboard API key"
        value={apiKey}
        onChange={(e) => {
          setApiKey(e.target.value);
          sync(e.target.value, orgId);
        }}
      />
      <Input
        autoComplete="off"
        inputMode="numeric"
        placeholder="Organization ID"
        value={orgId}
        onChange={(e) => {
          setOrgId(e.target.value);
          sync(apiKey, e.target.value);
        }}
      />
      {hideHint ? null : (
        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#fd5200]" />
          <span>
            Use your Stats dashboard API key from your Zyte account, not the
            Zyte API key you scrape with. Your organization ID is the number in
            the dashboard URL: app.zyte.com/o/000000 means 000000.
          </span>
        </p>
      )}
    </div>
  );
}
