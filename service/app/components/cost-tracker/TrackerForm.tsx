import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plug, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { ButtonElement } from "~/components/elements";
import type { CostTrackerCreatePayload } from "~/types/cost-tracker.types";

const PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    keyHint: "Admin key, starts with sk-admin",
    placeholder: "sk-admin-…",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    keyHint: "Admin key, starts with sk-ant-admin (organization account)",
    placeholder: "sk-ant-admin-…",
  },
] as const;

const schema = z.object({
  provider: z.string().min(1, "Pick a provider"),
  label: z
    .string()
    .min(1, "Give this tracker a name")
    .max(60, "Keep it under 60 characters"),
  app: z
    .string()
    .min(1, "Name the app or workload this spend belongs to")
    .max(60, "Keep it under 60 characters"),
  apiKey: z.string().min(8, "Paste the full key"),
});

interface Props {
  onSubmit: (data: CostTrackerCreatePayload) => Promise<unknown>;
  loading?: boolean;
}

export default function TrackerForm({ onSubmit, loading }: Props) {
  const [open, setOpen] = useState(false);
  const form = useForm<CostTrackerCreatePayload>({
    resolver: zodResolver(schema),
    defaultValues: { provider: "openai", label: "", app: "", apiKey: "" },
  });

  const selected = PROVIDERS.find((p) => p.value === form.watch("provider"));

  const handleSubmit = async (data: CostTrackerCreatePayload) => {
    try {
      await onSubmit(data);
      form.reset({ provider: data.provider, label: "", app: "", apiKey: "" });
      setOpen(false);
    } catch {
      // surfaced via toast in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ButtonElement className="gap-2">
          <Plug className="h-4 w-4" />
          Add a tracker
        </ButtonElement>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Connect a provider account</DialogTitle>
          <DialogDescription>
            For spend that never runs through the SDK. Paste a read key, pick
            the app it belongs to, and we pull the real cost straight from the
            provider on a daily schedule.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Provider
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pick a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[11px]">
                    More providers land in upcoming phases.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Tracker name
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="eg. Research notebooks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="app"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Attribute to app
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="eg. data-pipeline" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    The pulled cost shows up under this app, same as SDK events.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    API key
                  </FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="off"
                      placeholder={selected?.placeholder ?? "Paste your key"}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="flex items-center gap-1.5 text-[11px]">
                    <ShieldCheck className="h-3 w-3 text-[#fd5200]" />
                    {selected?.keyHint ??
                      "We encrypt it and only show the last 4."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <ButtonElement type="submit" loading={loading} className="w-full">
                Connect and pull cost
              </ButtonElement>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
