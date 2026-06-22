import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
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
import DataForSeoAuthFields from "./DataForSeoAuthFields";
import ZyteAuthFields from "./ZyteAuthFields";
import type { TrackerCreatePayload } from "~/types/tracker.types";

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
  {
    value: "openrouter",
    label: "OpenRouter",
    keyHint: "Provisioning key from Settings → Provisioning Keys",
    placeholder: "sk-or-v1-…",
  },
  {
    value: "apify",
    label: "Apify",
    keyHint: "Personal API token from Settings → Integrations",
    placeholder: "apify_api_…",
  },
  {
    value: "dataforseo",
    label: "DataForSEO",
    keyHint: "Your DataForSEO credentials from the API access page",
    placeholder: "Paste your Base64 API key",
  },
  {
    value: "zyte",
    label: "Zyte",
    keyHint: "Your Stats dashboard API key and organization id",
    placeholder: "Stats dashboard API key",
  },
] as const;

const schema = z.object({
  provider: z.string().min(1, "Pick a provider"),
  apiKey: z.string().min(8, "Paste the full key"),
});

interface Props {
  onSubmit: (data: TrackerCreatePayload) => Promise<unknown>;
  loading?: boolean;
}

export default function ManualConnectForm({ onSubmit, loading }: Props) {
  const form = useForm<TrackerCreatePayload>({
    resolver: zodResolver(schema),
    defaultValues: { provider: "openai", apiKey: "" },
  });

  const provider = form.watch("provider");
  const selected = PROVIDERS.find((p) => p.value === provider);
  const isDfo = provider === "dataforseo";
  const isZyte = provider === "zyte";
  const isComposite = isDfo || isZyte;

  const handleSubmit = async (data: TrackerCreatePayload) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Provider
              </FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  form.setValue("apiKey", "", { shouldValidate: false });
                }}
              >
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
                We track the cost under this provider. More providers land in
                upcoming phases.
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
                {isComposite ? "Authentication" : "API key"}
              </FormLabel>

              {isDfo ? (
                <DataForSeoAuthFields
                  onChange={(value) =>
                    form.setValue("apiKey", value, { shouldValidate: true })
                  }
                />
              ) : isZyte ? (
                <ZyteAuthFields
                  onChange={(value) =>
                    form.setValue("apiKey", value, { shouldValidate: true })
                  }
                />
              ) : (
                <>
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
                </>
              )}

              <FormMessage />
            </FormItem>
          )}
        />

        <ButtonElement type="submit" loading={loading} className="w-full">
          Connect and pull cost
        </ButtonElement>
      </form>
    </Form>
  );
}
