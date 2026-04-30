import { forwardRef } from "react";
import { Button, type buttonVariants } from "~/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

type Props = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

const ButtonElement = forwardRef<HTMLButtonElement, Props>(
  ({ className, loading, disabled, children, ...rest }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(className)}
        {...rest}
      >
        {loading ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Button>
    );
  },
);

ButtonElement.displayName = "ButtonElement";

export default ButtonElement;
