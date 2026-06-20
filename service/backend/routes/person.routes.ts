import { Hono } from "hono";
import PersonService from "../services/person.service";
import { createCrudController } from "../controllers/crud.controller";
import type { Env } from "../types";
import type { ClerkVariables } from "../middleware/clerk";

const ctrl = createCrudController(PersonService);
const peopleRouter = new Hono<{ Bindings: Env; Variables: ClerkVariables }>();

peopleRouter.get("/", ctrl.list);
peopleRouter.post("/", ctrl.create);
peopleRouter.get("/:id", ctrl.get);
peopleRouter.patch("/:id", ctrl.update);
peopleRouter.delete("/:id", ctrl.remove);

export default peopleRouter;
