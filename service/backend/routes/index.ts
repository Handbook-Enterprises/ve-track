import adminRouter from "./admin.routes";
import v1Router from "./v1.routes";

const routes = (app: any) => {
  app.route("/api/admin", adminRouter);
  app.route("/api/v1", v1Router);
};

export default routes;
