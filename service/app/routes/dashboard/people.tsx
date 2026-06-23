import EntityPage from "~/components/dashboard/entity-page";
import { ENTITIES } from "~/utils/entity-dimensions";

export default function PeoplePage() {
  return <EntityPage config={ENTITIES.people} />;
}
