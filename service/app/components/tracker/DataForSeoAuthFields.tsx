import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Input } from "~/components/ui/input";

type DataForSeoMode = "credentials" | "key";

interface Props {
  onChange: (value: string) => void;
  autoFocus?: boolean;
  hideHint?: boolean;
}

export default function DataForSeoAuthFields({
  onChange,
  autoFocus,
  hideHint,
}: Props) {
  const [mode, setMode] = useState<DataForSeoMode>("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");

  const changeMode = (next: DataForSeoMode) => {
    setMode(next);
    setLogin("");
    setPassword("");
    setKey("");
    onChange("");
  };

  const syncCreds = (nextLogin: string, nextPassword: string) => {
    onChange(nextLogin && nextPassword ? `${nextLogin}:${nextPassword}` : "");
  };

  return (
    <div className="space-y-2">
      <ToggleGroup
        type="single"
        variant="segmented"
        value={mode}
        onValueChange={(value) => value && changeMode(value as DataForSeoMode)}
        className="w-full border border-foreground/15"
      >
        <ToggleGroupItem
          value="credentials"
          className="flex-1 py-2 text-[11px] uppercase tracking-[0.1em]"
        >
          Login and password
        </ToggleGroupItem>
        <ToggleGroupItem
          value="key"
          className="flex-1 border-l border-foreground/15 py-2 text-[11px] uppercase tracking-[0.1em] data-[state=on]:border-[#fd5200]"
        >
          API key
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "credentials" ? (
        <div className="space-y-2">
          <Input
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="API login (email)"
            value={login}
            onChange={(e) => {
              setLogin(e.target.value);
              syncCreds(e.target.value, password);
            }}
          />
          <Input
            type="password"
            autoComplete="off"
            placeholder="API password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              syncCreds(login, e.target.value);
            }}
          />
        </div>
      ) : (
        <Input
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Paste your Base64 API key"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            onChange(e.target.value);
          }}
        />
      )}

      {hideHint ? null : (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-[#fd5200]" />
          {mode === "credentials"
            ? "Your API login and the auto generated API password from the API access page, not your account password."
            : "Your Base64 API key from the API access page."}
        </p>
      )}
    </div>
  );
}
