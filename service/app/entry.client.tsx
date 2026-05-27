import * as Sentry from "@sentry/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router";
import { HydratedRouter } from "react-router/dom";
import {
  SENTRY_DSN,
  clientSentryEnabled,
  getStoredColorScheme,
} from "~/lib/sentry";

if (clientSentryEnabled()) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.feedbackIntegration({
        colorScheme: getStoredColorScheme(),
        showBranding: false,
        triggerLabel: "",
        triggerAriaLabel: "Open feedback form",
        formTitle: "Share your feedback",
        submitButtonLabel: "Send feedback",
        messageLabel: "Your feedback",
        messagePlaceholder:
          "Ideas, confusions, bugs, things you loved - share anything.",
        successMessageText: "Thanks - we read every message.",
        themeLight: {
          accentBackground: "#fd5200",
          accentForeground: "#ffffff",
          successColor: "#268d75",
          errorColor: "#ef4444",
        },
        themeDark: {
          accentBackground: "#fd5200",
          accentForeground: "#ffffff",
          successColor: "#2da98c",
          errorColor: "#ef4444",
        },
      }),
    ],
    tracesSampleRate: 0.1,
    sendDefaultPii: true,
    enableLogs: true,
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
