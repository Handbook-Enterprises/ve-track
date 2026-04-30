import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ButtonElement } from "~/components/elements";
import type { ApiKeyFormData } from "~/interfaces/api-key.interface";

const schema = z.object({
  name: z
    .string()
    .min(1, "Give the key a memorable label")
    .max(60, "Keep it under 60 characters"),
});

interface Props {
  onSubmit: (data: ApiKeyFormData) => Promise<unknown>;
  loading?: boolean;
}

export default function ApiKeyForm({ onSubmit, loading }: Props) {
  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (data: ApiKeyFormData) => {
    setSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex items-end gap-3"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                New API key label
              </FormLabel>
              <FormControl>
                <Input placeholder="ve-fanout production" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ButtonElement type="submit" loading={loading || submitting}>
          Create key
        </ButtonElement>
      </form>
    </Form>
  );
}
