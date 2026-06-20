import { useState } from "react";
import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  KeyRound,
  Plug,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ButtonElement } from "~/components/elements";
import IntegrateGuide from "./IntegrateGuide";
import ManualConnectForm from "./ManualConnectForm";
import type { AddMethod, TrackerCreatePayload } from "~/types/tracker.types";

type Step = "choose" | AddMethod;

interface Props {
  onSubmit: (data: TrackerCreatePayload) => Promise<unknown>;
  loading?: boolean;
}

const METHODS: {
  value: AddMethod;
  title: string;
  blurb: string;
  icon: typeof Boxes;
}[] = [
  {
    value: "integrate",
    title: "Integrate into an app",
    blurb:
      "The spend happens inside an app you built. Drop the SDK into your worker and every provider call is tracked automatically.",
    icon: Boxes,
  },
  {
    value: "manual",
    title: "Add manually",
    blurb:
      "You call a provider directly, not from one of your own apps (scripts, notebooks, the dashboard). Connect the account with a key and we pull the real bill.",
    icon: KeyRound,
  },
];

const TITLES: Record<Step, string> = {
  choose: "Add a tracker",
  integrate: "Integrate into your app",
  manual: "Connect a provider account",
};

const DESCRIPTIONS: Record<Step, string> = {
  choose: "Two ways to get a provider's cost into ve-track. Pick how this spend reaches you.",
  integrate: "Track spend from inside an app you built.",
  manual:
    "For spend made directly against a provider, outside any app you built.",
};

export default function AddTrackerDialog({ onSubmit, loading }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");

  const reset = () => setStep("choose");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setTimeout(reset, 200);
  };

  const handleManualSubmit = async (data: TrackerCreatePayload) => {
    try {
      await onSubmit(data);
      handleOpenChange(false);
    } catch {
      // surfaced via toast in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ButtonElement className="gap-2">
          <Plug className="h-4 w-4" />
          Add a tracker
        </ButtonElement>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          {step !== "choose" ? (
            <button
              type="button"
              onClick={reset}
              className="mb-1 inline-flex w-fit items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-[#fd5200]"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          ) : null}
          <DialogTitle>{TITLES[step]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[step]}</DialogDescription>
        </DialogHeader>

        {step === "choose" ? (
          <div className="grid gap-3">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setStep(m.value)}
                className="group flex items-start gap-4 border border-foreground/15 bg-card p-4 text-left transition-colors hover:border-[#fd5200] hover:bg-[#fd5200]/[0.04]"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-foreground/15 text-foreground/70 transition-colors group-hover:border-[#fd5200] group-hover:text-[#fd5200]">
                  <m.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold">{m.title}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[#fd5200]" />
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">
                    {m.blurb}
                  </span>
                </span>
              </button>
            ))}
            <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
              Not sure? If you wrote the app that makes the calls, integrate it.
              If the calls come from outside your apps, add it manually.
            </p>
          </div>
        ) : null}

        {step === "integrate" ? <IntegrateGuide /> : null}

        {step === "manual" ? (
          <ManualConnectForm onSubmit={handleManualSubmit} loading={loading} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
