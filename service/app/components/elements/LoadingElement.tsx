import { cn } from "~/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

export default function LoadingElement({ size = 20, className }: Props) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
