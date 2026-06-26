import EntityPage from "~/components/dashboard/entity-page";
import { ENTITIES } from "~/utils/entity-dimensions";

export default function ActionsPage() {
  return <EntityPage config={ENTITIES.action} />;
}
