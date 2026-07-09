import { EllipsisVertical, GitMerge, PencilLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ButtonElement } from "~/components/elements";
import type { UsageGroup } from "~/types/usage.types";

interface Props {
  group: UsageGroup;
  onRename: (group: UsageGroup) => void;
  onMerge: (group: UsageGroup) => void;
}

export default function ActionRowMenu({ group, onRename, onMerge }: Props) {
  if (!group.key) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ButtonElement
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Manage action"
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVertical className="h-3.5 w-3.5" />
        </ButtonElement>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onRename(group)}>
          <PencilLine className="h-3.5 w-3.5" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMerge(group)}>
          <GitMerge className="h-3.5 w-3.5" />
          Merge into another action
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
