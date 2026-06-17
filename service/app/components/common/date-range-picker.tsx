import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { cn } from "~/lib/utils";
import {
  RANGE_PRESETS,
  buildCustomRange,
  buildPreset,
  type DateRange,
  type RangePresetId,
} from "~/utils/date-range";

interface Props {
  value: DateRange;
  activePresetId: RangePresetId | null;
  onChange: (range: DateRange, presetId: RangePresetId | null) => void;
}

export default function DateRangePicker({
  value,
  activePresetId,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>({
    from: new Date(value.from),
    to: new Date(value.to),
  });

  const choosePreset = (id: RangePresetId) => {
    onChange(buildPreset(id), id);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!draft?.from) return;
    const range = buildCustomRange(draft.from, draft.to ?? draft.from);
    onChange(range, null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 justify-between gap-2 px-3 font-medium"
        >
          <CalendarDays className="size-3.5 text-muted-foreground" />
          <span className="text-[13px]">{value.label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Tabs defaultValue={activePresetId ? "presets" : "custom"}>
          <div className="border-b px-3 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="presets" className="flex-1">
                Presets
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex-1">
                Custom
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="presets" className="m-0 p-2">
            <div className="flex w-[15rem] flex-col">
              {RANGE_PRESETS.map((preset) => {
                const active = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => choosePreset(preset.id)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:bg-muted",
                      active && "bg-primary/[0.06] text-primary",
                    )}
                  >
                    {preset.label}
                    {active ? <Check className="size-3.5" /> : null}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="m-0">
            <Calendar
              mode="range"
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={1}
            />
            <div className="flex items-center justify-between border-t px-3 py-2.5">
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {draft?.from
                  ? buildCustomRange(draft.from, draft.to ?? draft.from).label
                  : "Pick a start and end"}
              </p>
              <Button size="sm" onClick={applyCustom} disabled={!draft?.from}>
                Apply
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
