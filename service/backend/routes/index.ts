import adminRouter from "./admin.routes";
import dashboardRouter from "./dashboard.routes";
import v1Router from "./v1.routes";

const routes = (app: any) => {
  app.get("/api/health", (c: any) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() }),
  );
  app.route("/api/admin", adminRouter);
  app.route("/api/dashboard", dashboardRouter);
  app.route("/api/v1", v1Router);
};

export default routes;
