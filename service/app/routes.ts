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
    route("dashboard/trackers", "routes/dashboard/trackers.tsx", { id: "dashboard-trackers" }),
  ]),
] satisfies RouteConfig;
