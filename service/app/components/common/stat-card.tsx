import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  accent?: boolean;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border bg-card p-6 transition-colors duration-300",
        accent ? "border-primary/30 hover:border-primary/60" : "hover:border-foreground/15",
        className,
      )}
    >
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent" />
      )}
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {title}
          </p>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center border transition-colors duration-300",
              accent
                ? "border-primary/30 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                : "border-foreground/10 text-muted-foreground group-hover:border-foreground/20",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="mt-4 font-display text-[2rem] font-bold leading-none tracking-tight">
          {value}
        </p>
        {description && (
          <p className="mt-2.5 text-[12px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
