import { useCallback } from "react";
import { toast } from "sonner";
import { useAuthContext } from "~/context/AuthContext";
import { ActionsService } from "~/services/actions.service";
import { getErrorMessage } from "~/utils";
import { formatNumber } from "~/utils/format";

export function useActionAdmin(onChanged?: () => void) {
  const { authFetch } = useAuthContext();

  const rename = useCallback(
    async (slug: string, name: string): Promise<boolean> => {
      try {
        await ActionsService.rename(authFetch, slug, name);
        toast.success("Display name saved");
        onChanged?.();
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err));
        return false;
      }
    },
    [authFetch, onChanged],
  );

  const merge = useCallback(
    async (from: string, into: string): Promise<boolean> => {
      try {
        const result = await ActionsService.merge(authFetch, from, into);
        toast.success(
          `Moved ${formatNumber(result.data.retagged)} calls into ${into}`,
        );
        onChanged?.();
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err));
        return false;
      }
    },
    [authFetch, onChanged],
  );

  return { rename, merge };
}
