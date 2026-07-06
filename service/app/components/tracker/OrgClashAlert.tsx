import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { providerLabel } from "~/utils/providers";

export default function OrgClashAlert({
  provider,
  count,
  className,
}: {
  provider: string;
  count: number;
  className?: string;
}) {
  const label = providerLabel(provider);
  return (
    <Alert variant="warning" className={className}>
      <TriangleAlert />
      <AlertTitle>
        One organization, counted {count} times
      </AlertTitle>
      <AlertDescription>
        {count} accounts report an identical lifetime total. {label} reports
        spend for the whole organization, not per key, so every key from one
        organization repeats the same cost in your totals. Keep one account per
        organization and disconnect the rest. Disconnecting removes that
        account&apos;s pulled spend from your dashboard.
      </AlertDescription>
    </Alert>
  );
}
