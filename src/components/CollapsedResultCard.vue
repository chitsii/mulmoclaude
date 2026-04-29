<template>
  <button
    type="button"
    class="w-full flex items-center gap-2 px-3 py-1.5 text-left bg-white border rounded-lg hover:bg-gray-50 text-gray-600"
    :class="selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'"
    :title="result.title || result.toolName"
    data-testid="collapsed-result-card"
    @click="emit('expand', result.uuid)"
  >
    <span class="material-icons text-sm text-gray-400 shrink-0">{{ iconFor(result.toolName) }}</span>
    <span class="text-sm truncate">{{ result.title || result.toolName }}</span>
    <span v-if="timestamp" class="ml-auto text-[10px] text-gray-400 shrink-0">
      {{ formatSmartTime(timestamp) }}
    </span>
    <span class="font-mono text-xs text-gray-400 shrink-0">{{ result.toolName }}</span>
  </button>
</template>

<script setup lang="ts">
import type { ToolResultComplete } from "gui-chat-protocol/vue";
import { formatSmartTime } from "../utils/format/date";

defineProps<{
  result: ToolResultComplete;
  selected?: boolean;
  timestamp?: number;
}>();

const emit = defineEmits<{
  expand: [uuid: string];
}>();

function iconFor(toolName: string): string {
  if (toolName === "text-response") return "chat";
  return "extension";
}
</script>
