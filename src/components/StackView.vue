<template>
  <div class="h-full flex flex-col bg-gray-50">
    <div class="shrink-0 flex items-center gap-1 text-xs text-gray-400 px-4 pt-3 pb-2" data-testid="stack-role-header">
      <span v-if="sessionRoleIcon" class="material-icons text-xs leading-none">{{ sessionRoleIcon }}</span>
      <span v-if="sessionRoleName">{{ sessionRoleName }}</span>
      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="text-gray-400 hover:text-gray-700"
          :class="{ 'text-blue-500': showRightSidebar }"
          :title="t('sidebarHeader.toolCallHistory')"
          :aria-label="t('sidebarHeader.toolCallHistory')"
          :aria-pressed="showRightSidebar"
          @click="emit('toggle-right-sidebar')"
        >
          <span class="material-icons text-lg" aria-hidden="true">build</span>
        </button>
        <CanvasViewToggle :model-value="layoutMode" @update:model-value="(mode) => emit('update:layoutMode', mode)" />
      </div>
    </div>
    <!-- Empty state pulled out of the scroll container so `h-full` +
         the container's `pb-4` padding can't combine into a stray
         scrollbar. A sibling `flex-1` slot centers cleanly. -->
    <div v-if="toolResults.length === 0" class="flex-1 flex items-center justify-center text-gray-400 text-sm" data-testid="stack-empty">
      {{ t("common.noResultsYet") }}
    </div>
    <div v-else ref="containerRef" class="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3" data-testid="stack-scroll">
      <!-- Collapsed-older banner. Shown only when some older results
           are still hidden. Pinned at the top of the scroll so the
           user can find it without scrolling. -->
      <div v-if="collapsedCount > 0" class="flex items-center gap-2 pt-3 text-xs text-gray-500" data-testid="stack-show-older">
        <button type="button" class="px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50" @click="showOlder">
          {{ t("stack.showOlder", { count: Math.min(collapsedCount, EXPAND_BATCH_SIZE) }) }}
        </button>
        <button type="button" class="text-blue-600 hover:underline" @click="showAll">{{ t("stack.showAll") }}</button>
        <span class="text-gray-400">{{ t("stack.olderHidden", { count: collapsedCount }) }}</span>
      </div>
      <template v-for="(result, index) in toolResults" :key="result.uuid">
        <CollapsedResultCard
          v-if="!shouldRenderFull(result.uuid, toolResults.length - 1 - index)"
          :result="result"
          :selected="result.uuid === selectedResultUuid"
          :timestamp="resultTimestamps.get(result.uuid)"
          @expand="expandSingle"
        />
        <div
          v-else
          :ref="(element) => setItemRef(result.uuid, element as HTMLElement | null)"
          class="bg-white rounded-lg border transition-colors"
          :class="result.uuid === selectedResultUuid ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'"
        >
          <button
            class="w-full flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-left hover:bg-gray-50"
            :title="result.title || result.toolName"
            @click="emit('select', result.uuid)"
          >
            <span class="material-icons text-sm text-gray-400">{{ iconFor(result.toolName) }}</span>
            <span class="text-sm font-medium text-gray-800 truncate">{{ result.title || result.toolName }}</span>
            <span v-if="resultTimestamps.get(result.uuid)" class="text-[10px] text-gray-400 shrink-0">{{
              formatSmartTime(resultTimestamps.get(result.uuid)!)
            }}</span>
            <span class="font-mono text-xs text-gray-400 shrink-0">{{ result.toolName }}</span>
          </button>
          <!-- text-response: render the message as Markdown via the
           underlying plugin View. The .stack-text-response class below
           collapses the plugin's own card chrome (outer p-6, inner
           rounded/border/shadow box, role header) so only the stack
           card's own border shows.

           We render the upstream OriginalView directly rather than our
           local TextResponseView wrapper, so we lose the wrapper's
           "open external links in a new tab" click handler. Attach
           the same handler here via @click.capture so cross-origin
           links in assistant Markdown don't navigate the SPA away. -->
          <div v-if="isTextResponse(result)" class="stack-text-response" @click.capture="handleExternalLinkClick">
            <TextResponseOriginalView :selected-result="result" />
          </div>
          <!-- Document-like plugins: let the content flow at its natural
           height by overriding the plugin's internal h-full / overflow
           / flex-1 via the .stack-natural scoped styles below. For
           plugins that embed iframes (e.g. presentHtml) we also size
           each iframe to its content after load. -->
          <div
            v-else-if="isStackNatural(result.toolName)"
            :ref="(element) => setNaturalWrapperRef(result.uuid, element as HTMLElement | null)"
            class="stack-natural"
          >
            <component
              :is="getPlugin(result.toolName)?.viewComponent"
              v-if="getPlugin(result.toolName)?.viewComponent"
              :selected-result="result"
              :send-text-message="sendTextMessage"
              @update-result="(r: ToolResultComplete) => emit('updateResult', r)"
            />
          </div>
          <!-- Other plugins: fixed height wrapper so plugins that rely on
           h-full continue to render properly. -->
          <div v-else :style="{ height: PLUGIN_HEIGHT }">
            <component
              :is="getPlugin(result.toolName)?.viewComponent"
              v-if="getPlugin(result.toolName)?.viewComponent"
              :selected-result="result"
              :send-text-message="sendTextMessage"
              @update-result="(r: ToolResultComplete) => emit('updateResult', r)"
            />
            <pre v-else class="h-full overflow-auto p-4 text-xs text-gray-500 whitespace-pre-wrap">{{ JSON.stringify(result, null, 2) }}</pre>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { getPlugin } from "../tools";
import type { ToolResultComplete } from "gui-chat-protocol/vue";
import { View as TextResponseOriginalView } from "../plugins/textResponse/index";
import { handleExternalLinkClick } from "../utils/dom/externalLink";
import type { TextResponseData } from "../plugins/textResponse/types";
import { formatSmartTime } from "../utils/format/date";
import { isRecord } from "../utils/types";
import CanvasViewToggle from "./CanvasViewToggle.vue";
import CollapsedResultCard from "./CollapsedResultCard.vue";
import { INITIAL_VISIBLE_RESULTS, EXPAND_BATCH_SIZE } from "../config/uiLimits";
import type { LayoutMode } from "../utils/canvas/layoutMode";

const { t } = useI18n();

// Most plugin viewComponents use h-full internally, so a defined parent
// height is required for them to render. text-response and the
// "stack-natural" plugins below are special-cased.
const PLUGIN_HEIGHT = "min(60vh, 560px)";

// How long to ignore scroll-spy after a programmatic scroll (sidebar
// click, auto-scroll on new result). Keeps the spy from emitting a
// stale uuid while the scroll is still settling.
const SCROLL_SPY_SUPPRESS_MS = 150;

// Plugins that look better flowing at natural height in stack view
// rather than being clipped to PLUGIN_HEIGHT with an inner scrollbar.
const STACK_NATURAL_TOOLS = new Set<string>([
  "presentHtml",
  "presentDocument",
  "presentSpreadsheet",
  "manageWiki",
  // presentChart documents can hold multiple charts; fixed-height
  // clipping forces an inner scrollbar per result. Letting them flow
  // keeps everything visible in one scroll.
  "presentChart",
]);

function isStackNatural(toolName: string): boolean {
  return STACK_NATURAL_TOOLS.has(toolName);
}

const props = defineProps<{
  toolResults: ToolResultComplete[];
  selectedResultUuid: string | null;
  resultTimestamps: Map<string, number>;
  sendTextMessage?: (text: string) => void;
  sessionRoleName?: string;
  sessionRoleIcon?: string;
  layoutMode: LayoutMode;
  showRightSidebar: boolean;
}>();

const emit = defineEmits<{
  select: [uuid: string];
  updateResult: [result: ToolResultComplete];
  "update:layoutMode": [mode: LayoutMode];
  "toggle-right-sidebar": [];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const itemRefs = new Map<string, HTMLElement>();
const naturalWrapperRefs = new Map<string, HTMLElement>();

// How many of the newest results render as full plugin views. Older
// ones show as 1-line collapsed cards the user can click to expand
// individually, or expand in batches via the "show older" button.
// Starts at INITIAL_VISIBLE_RESULTS; "show older" bumps it by
// EXPAND_BATCH_SIZE (or to Infinity for "show all").
const fullRenderTail = ref(INITIAL_VISIBLE_RESULTS);

// Individually-expanded uuids (clicked on a collapsed card). These
// stay expanded even when older than the tail threshold.
const manuallyExpandedUuids = ref<Set<string>>(new Set());

// True when this result should render its full plugin view: either
// it's within the tail window, or the user clicked its collapsed
// card to expand it in place.
function shouldRenderFull(uuid: string, indexFromEnd: number): boolean {
  if (indexFromEnd < fullRenderTail.value) return true;
  return manuallyExpandedUuids.value.has(uuid);
}

// Number of results currently kept collapsed (used by the "show older"
// banner — only shown when there are some).
const collapsedCount = computed(() => {
  const total = props.toolResults.length;
  if (total <= fullRenderTail.value) return 0;
  // Subtract any that the user manually expanded — those still
  // render full and shouldn't count toward the "older hidden" total.
  let expandedFromOlder = 0;
  const tailStart = total - fullRenderTail.value;
  for (let i = 0; i < tailStart; i += 1) {
    if (manuallyExpandedUuids.value.has(props.toolResults[i].uuid)) expandedFromOlder += 1;
  }
  return tailStart - expandedFromOlder;
});

function showOlder(): void {
  fullRenderTail.value += EXPAND_BATCH_SIZE;
}

function showAll(): void {
  fullRenderTail.value = Number.POSITIVE_INFINITY;
}

function expandSingle(uuid: string): void {
  manuallyExpandedUuids.value.add(uuid);
  manuallyExpandedUuids.value = new Set(manuallyExpandedUuids.value);
  emit("select", uuid);
}

// Reset when the tool-results list shrinks (= switching sessions or
// the session was cleared). Without this, a session with 10 results
// would inherit the previous session's expanded uuids.
watch(
  () => props.toolResults.length,
  (newLen, oldLen) => {
    if (newLen < oldLen) {
      fullRenderTail.value = INITIAL_VISIBLE_RESULTS;
      manuallyExpandedUuids.value = new Set();
    }
  },
);

function setItemRef(uuid: string, element: HTMLElement | null): void {
  if (element) itemRefs.set(uuid, element);
  else itemRefs.delete(uuid);
}

function setNaturalWrapperRef(uuid: string, element: HTMLElement | null): void {
  if (element) {
    naturalWrapperRefs.set(uuid, element);
    nextTick(() => sizeIframesIn(element));
  } else {
    naturalWrapperRefs.delete(uuid);
  }
}

// Sandboxed iframes inside stack-natural plugins (e.g. presentHtml)
// have no intrinsic content height, so CSS alone collapses them. Set
// each iframe's height to match its document's scrollHeight on load.
function sizeIframesIn(wrapper: HTMLElement): void {
  const iframes = wrapper.querySelectorAll<HTMLIFrameElement>("iframe");
  for (const iframe of iframes) {
    if (iframe.dataset.stackSized === "true") continue;
    iframe.dataset.stackSized = "true";
    const resize = () => resizeOneIframe(iframe);
    iframe.addEventListener("load", resize);
    // If the iframe already finished loading before we attached the
    // listener, size it now as well.
    try {
      if (iframe.contentDocument?.readyState === "complete") {
        resize();
      }
    } catch {
      // cross-origin — leave default height
    }
  }
}

function resizeOneIframe(iframe: HTMLIFrameElement): void {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const height = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
    if (height > 0) iframe.style.height = `${height}px`;
  } catch {
    // cross-origin sandbox — can't measure, leave default
  }
}

function isTextResponse(result: ToolResultComplete): result is ToolResultComplete<TextResponseData> {
  if (result.toolName !== "text-response") return false;
  const { data } = result;
  if (!isRecord(data)) return false;
  return typeof data.text === "string";
}

function iconFor(toolName: string): string {
  if (toolName === "text-response") return "chat";
  return "extension";
}

// Scroll-spy state: as the user scrolls the stack container we emit
// a `select` for whichever card currently occupies the top, so the
// sidebar selection always tracks what's on screen.
//
// Coordination between scroll and selection:
//   - `suppressScrollSync` is set while the component programmatically
//     scrolls (sidebar click → scrollIntoView, auto-scroll on new
//     result) so the spy doesn't fire on its own scroll.
//   - `scrollSpyEmittedUuid` holds the exact uuid the spy most
//     recently emitted. The watch on `selectedResultUuid` only skips
//     its scrollIntoView when the incoming uuid matches, so a
//     sidebar click that arrives right after a spy emit still gets
//     its normal scroll behaviour.
let suppressScrollSync = false;
let suppressScrollTimeout: ReturnType<typeof setTimeout> | null = null;
let scrollSpyRafId: number | null = null;
let scrollSpyEmittedUuid: string | null = null;

function beginSuppressScrollSync(): void {
  suppressScrollSync = true;
  if (suppressScrollTimeout !== null) clearTimeout(suppressScrollTimeout);
  suppressScrollTimeout = setTimeout(() => {
    suppressScrollSync = false;
    suppressScrollTimeout = null;
  }, SCROLL_SPY_SUPPRESS_MS);
}

function readPaddingTop(element: HTMLElement): number {
  const value = parseFloat(getComputedStyle(element).paddingTop);
  return Number.isFinite(value) ? value : 0;
}

// Walk items in order and return the last one whose top edge is at or
// above the padded content top of the container. Accounting for the
// container's padding-top means the handoff happens at the visual
// start of the cards rather than the invisible border of the
// container itself. Iterating in DOM order lets us break early once
// an item is below the line.
function computeActiveUuidFromScroll(): string | null {
  if (!containerRef.value) return null;
  const container = containerRef.value;
  const paddedTop = container.getBoundingClientRect().top + readPaddingTop(container);
  let activeUuid: string | null = null;
  for (const result of props.toolResults) {
    const element = itemRefs.get(result.uuid);
    if (!element) continue;
    if (element.getBoundingClientRect().top <= paddedTop) {
      activeUuid = result.uuid;
    } else {
      break;
    }
  }
  return activeUuid;
}

function onContainerScroll(): void {
  if (suppressScrollSync) return;
  if (scrollSpyRafId !== null) return;
  scrollSpyRafId = requestAnimationFrame(() => {
    scrollSpyRafId = null;
    if (suppressScrollSync) return;
    const activeUuid = computeActiveUuidFromScroll();
    if (activeUuid && activeUuid !== props.selectedResultUuid) {
      scrollSpyEmittedUuid = activeUuid;
      emit("select", activeUuid);
    }
  });
}

// Scroll the selected card to the top whenever the external selection
// changes (sidebar click, initial load). Skip the scroll only when the
// incoming uuid matches the one we just emitted from the spy — that
// means the viewport is already in the right place. Any other change
// (sidebar click, new result) still gets its normal scrollIntoView.
watch(
  () => props.selectedResultUuid,
  (uuid) => {
    if (!uuid) return;
    if (scrollSpyEmittedUuid === uuid) {
      scrollSpyEmittedUuid = null;
      return;
    }
    scrollSpyEmittedUuid = null;
    nextTick(() => {
      const element = itemRefs.get(uuid);
      if (!element) return;
      beginSuppressScrollSync();
      element.scrollIntoView({ block: "start", behavior: "auto" });
    });
  },
);

// Key that changes both on new results AND on streaming updates to
// the last text card (which appends in place, leaving length stable).
const latestResultScrollKey = computed(() => {
  const list = props.toolResults;
  const last = list[list.length - 1];
  return `${list.length}:${last?.uuid ?? ""}:${last?.message?.length ?? 0}`;
});

watch(latestResultScrollKey, () => {
  nextTick(() => {
    if (containerRef.value) {
      beginSuppressScrollSync();
      containerRef.value.scrollTop = containerRef.value.scrollHeight;
    }
    // New items may have brought in more iframes to size.
    for (const wrapper of naturalWrapperRefs.values()) {
      sizeIframesIn(wrapper);
    }
  });
});

onMounted(() => {
  containerRef.value?.addEventListener("scroll", onContainerScroll, {
    passive: true,
  });
  // Align the initial scroll position with the externally selected
  // item so the sidebar and stack start in sync on mount.
  nextTick(() => {
    if (!props.selectedResultUuid) return;
    const element = itemRefs.get(props.selectedResultUuid);
    if (!element) return;
    beginSuppressScrollSync();
    element.scrollIntoView({ block: "start", behavior: "auto" });
  });
});

onUnmounted(() => {
  containerRef.value?.removeEventListener("scroll", onContainerScroll);
  if (scrollSpyRafId !== null) cancelAnimationFrame(scrollSpyRafId);
  if (suppressScrollTimeout !== null) clearTimeout(suppressScrollTimeout);
  naturalWrapperRefs.clear();
});
</script>

<style scoped>
/* Force document-like plugin viewComponents (presentHtml,
   presentDocument, presentSpreadsheet) to flow at their natural
   height inside stack view instead of clipping to the wrapper with
   an inner scrollbar. */
.stack-natural :deep(.h-full),
.stack-natural :deep(.min-h-full) {
  height: auto !important;
  min-height: 0 !important;
}
.stack-natural :deep(.overflow-hidden),
.stack-natural :deep(.overflow-auto),
.stack-natural :deep(.overflow-y-auto),
.stack-natural :deep(.overflow-x-auto) {
  overflow: visible !important;
}
.stack-natural :deep(.flex-1) {
  flex: 0 0 auto !important;
}

/* Collapse the nested chrome that text-response draws around its
   Markdown output so it reads like plain content inside our stack card
   instead of creating a second border/shadow "card" inside ours. */
.stack-text-response :deep(.text-response-content-wrapper > .p-6) {
  padding: 0.5rem 0.75rem;
}
.stack-text-response :deep(.text-response-container .max-w-3xl) {
  max-width: none;
  margin-left: 0;
  margin-right: 0;
}
.stack-text-response :deep(.text-response-container .mb-2) {
  display: none; /* redundant role header — stack card header shows it already */
}
.stack-text-response :deep(.text-response-container .shadow-sm) {
  border: 0;
  box-shadow: none;
  padding: 0;
  background: transparent;
  border-radius: 0;
}
</style>
