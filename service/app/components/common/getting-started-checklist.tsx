import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { useOrganization } from "@clerk/react-router";
import {
  ArrowRight,
  BookOpen,
  Check,
  KeyRound,
  PlugZap,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import QuickActions from "~/components/common/quick-actions";
import { useApiKeys } from "~/hooks/useApiKeys";
import { useTrackers } from "~/hooks/useTrackers";
import { useUserFlag } from "~/hooks/useUserFlag";
import { buildPreset } from "~/utils/date-range";
import { cn } from "~/lib/utils";

interface Step {
  id: string;
  marker: string;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
  done: boolean;
}

interface CardProps {
  hasSpend: boolean;
  onDismiss: () => void;
}

function ChecklistCard({ hasSpend, onDismiss }: CardProps) {
  const period = useMemo(
    () => ({
      range: buildPreset("lifetime"),
      presetId: "lifetime" as const,
      isLifetime: true,
    }),
    [],
  );

  const { apiKeys, loading: keysLoading } = useApiKeys();
  const { trackers, loading: trackersLoading } = useTrackers(period);
  const { organization } = useOrganization();

  const hasApiKey = apiKeys.some((k) => !k.revoked_at);
  const hasTracker = trackers.length > 0;
  const hasTeam = (organization?.membersCount ?? 0) > 1;

  const steps: Step[] = [
    {
      id: "key",
      marker: "01",
      icon: KeyRound,
      title: "Create your first API key",
      description: "Authenticate the SDK so your events can reach VE Track.",
      cta: "Create a key",
      href: "/dashboard/keys",
      done: hasApiKey,
    },
    {
      id: "tracker",
      marker: "02",
      icon: PlugZap,
      title: "Connect a tracker or add the SDK",
      description: "Pull a real provider bill, or drop the SDK into your app.",
      cta: "Add a tracker",
      href: "/dashboard/trackers",
      done: hasTracker,
    },
    {
      id: "spend",
      marker: "03",
      icon: BookOpen,
      title: "Watch your first spend land",
      description: "Make one tracked call and watch the dollars appear here.",
      cta: "See how",
      href: "/docs#quickstart",
      external: true,
      done: hasSpend,
    },
    {
      id: "team",
      marker: "04",
      icon: Users,
      title: "Invite your team",
      description: "Bring in teammates so spend maps to the people behind it.",
      cta: "Invite people",
      href: "/dashboard/people",
      done: hasTeam,
    },
  ];

  const total = steps.length;
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / total) * 100);
  const loading = keysLoading || trackersLoading;
  const allDone = !loading && completed === total;

  if (loading) {
    return (
      <section className="border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="border bg-card">
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {allDone ? "── all set" : "── getting started"}
          </p>
          <h2 className="mt-1.5 text-[15px] font-semibold tracking-tight">
            {allDone ? "You are all set up" : "Get your spend flowing"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss getting started"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-2 border-b px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
            {completed} of {total} complete
          </p>
          <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
            {pct}%
          </p>
        </div>
        <Progress value={pct} />
      </div>

      <ul className="divide-y">
        {steps.map((step) => {
          const body = (
            <>
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center border transition-colors",
                  step.done
                    ? "border-[#fd5200] bg-[#fd5200] text-white"
                    : "border-foreground/15 text-foreground/70 group-hover:border-[#fd5200] group-hover:text-[#fd5200]",
                )}
              >
                {step.done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-medium tabular-nums text-muted-foreground">
                    {step.marker}
                  </span>
                  <span
                    className={cn(
                      "text-[14px] font-semibold",
                      step.done && "text-muted-foreground line-through",
                    )}
                  >
                    {step.title}
                  </span>
                </span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                  {step.description}
                </span>
              </span>

              {step.done ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#fd5200]">
                  done
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-foreground transition-colors group-hover:text-[#fd5200]">
                  {step.cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </>
          );

          const rowClass =
            "group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fd5200]/[0.04]";

          return (
            <li key={step.id}>
              {step.external ? (
                <a href={step.href} className={rowClass}>
                  {body}
                </a>
              ) : (
                <Link to={step.href} className={rowClass}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function GettingStartedChecklist({
  hasSpend,
}: {
  hasSpend: boolean;
}) {
  const [params] = useSearchParams();
  const preview = params.get("checklist") === "preview";
  const [dismissed, setDismissed] = useUserFlag("checklist-dismissed");

  if (dismissed && !preview) return <QuickActions />;

  return (
    <ChecklistCard hasSpend={hasSpend} onDismiss={() => setDismissed(true)} />
  );
}
