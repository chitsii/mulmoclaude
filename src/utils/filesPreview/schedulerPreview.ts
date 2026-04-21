// Synthesize a ToolResultComplete<SchedulerData> from raw scheduler
// items.json content so FilesView can render it with the scheduler
// plugin's calendar view. Extracted from FilesView.vue (#507 step 8).

import type { ToolResultComplete } from "gui-chat-protocol/vue";
import type {
  SchedulerData,
  ScheduledItem,
} from "../../plugins/scheduler/index";
import { WORKSPACE_FILES } from "../../config/workspacePaths";

function isScheduledItem(value: unknown): value is ScheduledItem {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || typeof value.id !== "string") return false;
  if (!("title" in value) || typeof value.title !== "string") return false;
  return true;
}

function isScheduledItemArray(value: unknown): value is ScheduledItem[] {
  return Array.isArray(value) && value.every(isScheduledItem);
}

export function toSchedulerResult(
  selectedPath: string | null,
  rawText: string | null,
): ToolResultComplete<SchedulerData> | null {
  if (selectedPath !== WORKSPACE_FILES.schedulerItems) return null;
  if (rawText === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }
  if (!isScheduledItemArray(parsed)) return null;
  return {
    uuid: "files-scheduler-preview",
    toolName: "manageScheduler",
    message: WORKSPACE_FILES.schedulerItems,
    title: "Scheduler",
    data: { items: parsed },
  };
}
