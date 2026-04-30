import { forwardRef } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

interface Props extends React.ComponentProps<typeof Input> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

const InputElement = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, containerClassName, id, ...rest }, ref) => {
    const inputId = id || rest.name;
    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {label && (
          <Label
            htmlFor={inputId}
            className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            {label}
          </Label>
        )}
        <Input ref={ref} id={inputId} {...rest} />
        {error ? (
          <p className="text-[11px] text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);

InputElement.displayName = "InputElement";

export default InputElement;
