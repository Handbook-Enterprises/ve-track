import { Link } from "react-router";
import { ArrowUpRight, KeyRound } from "lucide-react";
import CodeBlock from "~/components/common/code-block";
import { ButtonElement } from "~/components/elements";

const INSTALL = "bun add github:Handbook-Enterprises/ve-track";

const SNIPPET = `import { trackedHandler } from "@viewengine/track";
import handler from "./app";

export default trackedHandler({
  app: "my-app",
  apiKey: env.VE_TRACK_KEY,
  resolveUser: (req) => req.headers.get("x-user-id"),
  fetch: handler.fetch,
});`;

export default function IntegrateGuide() {
  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        For spend made inside an app you built. Wrap your worker handler once and
        every call to a known provider is attributed automatically. No keys to
        paste here, the cost is captured per request in real time.
      </p>

      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          01 · install
        </p>
        <CodeBlock code={INSTALL} filename="terminal" />
      </div>

      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          02 · wrap your handler
        </p>
        <CodeBlock code={SNIPPET} filename="worker.ts" />
      </div>

      <div className="flex flex-col gap-2 border-t border-foreground/10 pt-4 sm:flex-row">
        <ButtonElement asChild className="flex-1 gap-2">
          <Link to="/docs">
            Open full docs
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </ButtonElement>
        <ButtonElement asChild variant="outline" className="flex-1 gap-2">
          <Link to="/dashboard/keys">
            <KeyRound className="h-4 w-4" />
            Get an API key
          </Link>
        </ButtonElement>
      </div>
    </div>
  );
}
