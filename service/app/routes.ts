import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("sign-in", "routes/sign-in.tsx"),
  route("sign-up", "routes/sign-up.tsx"),
  route("sso-callback", "routes/sso-callback.tsx"),
  route("docs", "routes/docs.tsx"),

  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/overview.tsx", { id: "dashboard-overview" }),
    route("dashboard/keys", "routes/dashboard/keys.tsx", { id: "dashboard-keys" }),
    route("dashboard/usage", "routes/dashboard/usage.tsx", { id: "dashboard-usage" }),
    route("dashboard/models", "routes/dashboard/models.tsx", { id: "dashboard-models" }),
    route("dashboard/apps", "routes/dashboard/apps.tsx", { id: "dashboard-apps" }),
    route("dashboard/people", "routes/dashboard/people.tsx", { id: "dashboard-people" }),
    route("dashboard/orgs", "routes/dashboard/orgs.tsx", { id: "dashboard-orgs" }),
    route("dashboard/trackers", "routes/dashboard/trackers.tsx", { id: "dashboard-trackers" }),
    route("dashboard/settings", "routes/dashboard/settings.tsx", { id: "dashboard-settings" }),
  ]),
] satisfies RouteConfig;
