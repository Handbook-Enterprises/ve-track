import { forwardRef } from "react";
import { cn } from "~/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

const CardElement = forwardRef<HTMLDivElement, Props>(
  ({ className, bordered = true, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-card text-card-foreground",
          bordered && "border",
          className,
        )}
        {...rest}
      />
    );
  },
);

CardElement.displayName = "CardElement";

export default CardElement;
