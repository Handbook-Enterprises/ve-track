import { useUser } from "@clerk/react-router";
import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export default function SentryUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && user) {
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.fullName ?? user.username ?? undefined,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
