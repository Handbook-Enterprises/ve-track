import { forwardRef } from "react";
import { cn } from "~/lib/utils";

const DivElement = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...rest }, ref) => {
  return <div ref={ref} className={cn(className)} {...rest} />;
});

DivElement.displayName = "DivElement";

export default DivElement;
