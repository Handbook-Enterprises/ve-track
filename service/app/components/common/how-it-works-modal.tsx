import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  ChevronRight,
  Compass,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ButtonElement } from "~/components/elements";
import { useOnboarding } from "~/context/OnboardingContext";

type Step = "intent" | "primer";

interface Intent {
  icon: LucideIcon;
  title: string;
  blurb: string;
  cta: string;
  action: "docs" | "trackers" | "primer";
}

const INTENTS: Intent[] = [
  {
    icon: Boxes,
    title: "Track spend inside an app I built",
    blurb:
      "Drop the SDK into your worker and every provider call is priced and attributed automatically. The docs walk you through the full setup.",
    cta: "Show me the docs",
    action: "docs",
  },
  {
    icon: KeyRound,
    title: "I call providers directly",
    blurb:
      "Scripts, notebooks, the provider dashboard, anything outside your own apps. Connect the account with a key and we pull the real bill for you.",
    cta: "Add a tracker",
    action: "trackers",
  },
  {
    icon: Compass,
    title: "Just show me how this works first",
    blurb:
      "New to cost attribution? Get the sixty second tour of what every number on your dashboard means.",
    cta: "Take the tour",
    action: "primer",
  },
];

interface Concept {
  marker: string;
  term: string;
  meaning: string;
}

const CONCEPTS: Concept[] = [
  {
    marker: "01",
    term: "Tracker",
    meaning:
      "A connected provider account. One key in, and we pull what you actually spent.",
  },
  {
    marker: "02",
    term: "Provider",
    meaning:
      "An AI or data service you pay for. OpenAI, Anthropic, Gemini, Zyte, DataForSEO and more.",
  },
  {
    marker: "03",
    term: "Spend",
    meaning:
      "The real billed cost, pulled straight from the provider or priced from a live catalog.",
  },
  {
    marker: "04",
    term: "Period",
    meaning:
      "The date range at the top. Lifetime shows everything ever, a window sums each day inside it.",
  },
  {
    marker: "05",
    term: "App",
    meaning:
      "A service you built. Spend is grouped by app so you see which product costs what.",
  },
  {
    marker: "06",
    term: "Action",
    meaning:
      "A labeled unit of work like a search or an embedding, so you know the cost per thing you do.",
  },
];

const TITLES: Record<Step, string> = {
  intent: "Welcome to VE Track",
  primer: "Your dashboard in sixty seconds",
};

const DESCRIPTIONS: Record<Step, string> = {
  intent:
    "VE Track shows you exactly where your AI spend goes. Tell us how you want to start.",
  primer: "Six words you will see everywhere. Here is what each one means.",
};

export default function HowItWorksModal() {
  const { open, closeOnboarding, markSeen } = useOnboarding();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intent");

  useEffect(() => {
    if (open) setStep("intent");
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) closeOnboarding();
  };

  const handleIntent = (action: Intent["action"]) => {
    if (action === "primer") {
      setStep("primer");
      return;
    }
    markSeen();
    closeOnboarding();
    if (action === "trackers") {
      navigate("/dashboard/trackers");
    } else {
      window.location.assign("/docs#quickstart");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          {step === "primer" ? (
            <button
              type="button"
              onClick={() => setStep("intent")}
              className="mb-1 inline-flex w-fit items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-[#fd5200]"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          ) : null}
          <DialogTitle>{TITLES[step]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        {step === "intent" ? (
          <div className="grid gap-3">
            {INTENTS.map((intent) => (
              <button
                key={intent.title}
                type="button"
                onClick={() => handleIntent(intent.action)}
                className="group flex items-start gap-4 border border-foreground/15 bg-card p-4 text-left transition-colors hover:border-[#fd5200] hover:bg-[#fd5200]/[0.04]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-foreground/15 text-foreground/70 transition-colors group-hover:border-[#fd5200] group-hover:text-[#fd5200]">
                  <intent.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold">
                      {intent.title}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#fd5200]" />
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                    {intent.blurb}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground transition-colors group-hover:text-[#fd5200]">
                    {intent.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === "primer" ? (
          <div className="space-y-4">
            <div className="grid gap-px bg-border">
              {CONCEPTS.map((concept) => (
                <div
                  key={concept.term}
                  className="flex items-start gap-4 bg-card p-4"
                >
                  <span className="font-mono text-[10px] font-medium text-muted-foreground tabular-nums">
                    {concept.marker}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[13.5px] font-semibold">
                      {concept.term}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                      {concept.meaning}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-dashed border-foreground/15 pt-4">
              <button
                type="button"
                onClick={() => setStep("intent")}
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Back to options
              </button>
              <ButtonElement className="gap-2" onClick={closeOnboarding}>
                Got it, explore my dashboard
                <ArrowRight className="h-4 w-4" />
              </ButtonElement>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
