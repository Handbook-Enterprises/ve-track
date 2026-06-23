import EntityPage from "~/components/dashboard/entity-page";
import { ENTITIES } from "~/utils/entity-dimensions";

export default function AppsPage() {
  return <EntityPage config={ENTITIES.app} />;
}
