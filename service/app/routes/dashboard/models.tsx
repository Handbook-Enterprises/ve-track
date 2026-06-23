import EntityPage from "~/components/dashboard/entity-page";
import { ENTITIES } from "~/utils/entity-dimensions";

export default function ModelsPage() {
  return <EntityPage config={ENTITIES.model} />;
}
