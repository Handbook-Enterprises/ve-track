import EntityPage from "~/components/dashboard/entity-page";
import { ENTITIES } from "~/utils/entity-dimensions";

export default function OrgsPage() {
  return <EntityPage config={ENTITIES.org} />;
}
