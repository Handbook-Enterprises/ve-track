import { cn } from "~/lib/utils";

interface Props {
  className?: string;
  showWord?: boolean;
}

export default function Logo({ className, showWord = true }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-3 w-3 rounded-full bg-[#FF4D00]" />
      {showWord && (
        <span className="font-display text-base font-bold uppercase tracking-tight">
          ve-track
        </span>
      )}
    </div>
  );
}
