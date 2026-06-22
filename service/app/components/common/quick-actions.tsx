import { Link } from "react-router";
import { ArrowRight, BookOpen, KeyRound, type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface QuickAction {
  marker: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
  cta: string;
  to: string;
  external?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    marker: "01",
    icon: KeyRound,
    title: "Track external API use",
    blurb:
      "Calling a provider directly, outside your own apps? Add a tracker account with the provider key and we pull the real bill automatically.",
    cta: "Add a tracker account",
    to: "/dashboard/trackers",
  },
  {
    marker: "02",
    icon: BookOpen,
    title: "Use it in your app",
    blurb:
      "Spend happening inside an app you built? Drop the SDK into your worker and every provider call is tracked. The docs walk you through the full integration.",
    cta: "Visit the docs",
    to: "/docs#quickstart",
    external: true,
  },
];

export default function QuickActions() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between border-b border-dashed border-foreground/15 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          ── quick actions
        </p>
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
          two ways to start
        </p>
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {ACTIONS.map((action) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-foreground/15 text-foreground/70 transition-colors group-hover:border-primary group-hover:text-primary">
                  <action.icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
                  {action.marker}
                </span>
              </div>
              <h3 className="mt-5 text-[15px] font-semibold tracking-tight">
                {action.title}
              </h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
                {action.blurb}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground transition-colors group-hover:text-primary">
                {action.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </>
          );

          const className = cn(
            "group flex flex-col bg-card p-6 text-left transition-colors duration-300 hover:bg-primary/[0.04]",
          );

          return action.external ? (
            <a key={action.marker} href={action.to} className={className}>
              {body}
            </a>
          ) : (
            <Link key={action.marker} to={action.to} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
