<template>
  <div class="min-h-24 flex items-center justify-center">
    <img
      v-if="result.data?.imageData"
      :src="result.data.imageData"
      class="max-w-full h-auto rounded"
      alt="Canvas drawing"
    />
    <div v-else class="text-gray-400 text-sm">No drawing yet</div>
  </div>
</template>

<script setup lang="ts">
import type { ToolResult } from "gui-chat-protocol/vue";
import type { ImageToolData } from "./definition";

defineProps<{
  result: ToolResult<ImageToolData>;
}>();
</script>
