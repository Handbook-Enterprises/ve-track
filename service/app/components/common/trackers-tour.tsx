import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuthContext } from "~/context/AuthContext";
import { useUserFlag } from "~/hooks/useUserFlag";

export default function TrackersTour() {
  const { isLoaded, userId } = useAuthContext();
  const [seen, setSeen] = useUserFlag("trackers-tour-seen");
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId || seen || started.current) return;
    started.current = true;

    const timer = window.setTimeout(() => {
      const tour = driver({
        popoverClass: "vetrack-tour",
        showProgress: true,
        allowClose: true,
        overlayOpacity: 0.6,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        steps: [
          {
            element: '[data-tour="add-tracker"]',
            popover: {
              title: "Start here",
              description:
                "Add a tracker to begin. Drop the SDK into an app you built, or connect a provider key and we pull the real bill for you automatically.",
              side: "bottom",
              align: "end",
            },
          },
          {
            element: '[data-tour="providers"]',
            popover: {
              title: "Your tracked providers",
              description:
                "Every provider you track lands here. Click a provider to expand it, then click an account to open its full cost detail.",
              side: "top",
              align: "start",
            },
          },
          {
            element: '[data-tour="period"]',
            popover: {
              title: "Track any period",
              description:
                "Switch the time window whenever you want. Last 28 days, this month, lifetime, or a custom range you pick.",
              side: "bottom",
              align: "end",
            },
          },
          {
            popover: {
              title: "Lifetime first, then daily",
              description:
                "Open any account and you see the lifetime total first, the big headline number, then your daily cost charted over time for whatever period you choose. That is how you track spend across any window.",
            },
          },
        ],
        onDestroyed: () => setSeen(true),
      });
      tour.drive();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [isLoaded, userId, seen, setSeen]);

  return null;
}
