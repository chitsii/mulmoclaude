<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="flex items-center gap-2 -my-1 -ml-1 py-1 pl-1 pr-1 rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      data-testid="app-home-btn"
      :title="t('sidebarHeader.home')"
      :aria-label="t('sidebarHeader.home')"
      @click="emit('home')"
    >
      <img :src="logoUrl" alt="" class="h-[50px] w-auto -my-3.5 -ml-3 rounded object-contain shrink-0" />
      <!-- span, not h1: `<h1>` inside `<button>` is invalid HTML, and
           the brand label here is a clickable logo, not a page heading. -->
      <span data-testid="app-title" class="text-sm font-semibold text-gray-800" :style="titleStyle">MulmoClaude</span>
    </button>
    <div class="flex gap-0.5">
      <LockStatusPopup
        ref="lockPopup"
        :sandbox-enabled="sandboxEnabled"
        :open="lockPopupOpen"
        @update:open="lockPopupOpen = $event"
        @test-query="(q) => emit('testQuery', q)"
      />
      <div
        v-if="!connected"
        class="h-8 w-8 flex items-center justify-center rounded text-amber-500"
        :title="t('sidebarHeader.disconnected')"
        :aria-label="t('sidebarHeader.disconnected')"
        data-testid="connection-disconnected"
      >
        <span class="material-icons text-base leading-none">cloud_off</span>
      </div>
      <NotificationBell :force-close="lockPopupOpen" @navigate="(action) => emit('notificationNavigate', action)" @update:open="onNotificationOpen" />
      <button
        class="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700"
        data-testid="theme-toggle-btn"
        :title="themeLabel"
        :aria-label="themeLabel"
        @click="cycleTheme"
      >
        <span class="material-icons text-base leading-none">{{ themeIcon }}</span>
      </button>
      <button
        class="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="today-journal-btn"
        :title="t('sidebarHeader.todayJournal')"
        :aria-label="t('sidebarHeader.todayJournal')"
        :disabled="todayJournalLoading"
        @click="openLatestDaily"
      >
        <span class="material-icons">today</span>
      </button>
      <button
        class="relative h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700"
        data-testid="settings-btn"
        :title="settingsLabel"
        :aria-label="settingsLabel"
        @click="emit('openSettings')"
      >
        <span class="material-icons">settings</span>
        <span
          v-if="!geminiAvailable"
          class="gemini-missing-badge absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-yellow-400 text-[9px] font-bold leading-none text-white ring-1 ring-white"
          data-testid="settings-gemini-badge"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from "vue";
import { useI18n } from "vue-i18n";
import LockStatusPopup from "./LockStatusPopup.vue";
import NotificationBell from "./NotificationBell.vue";
import { useClickOutside } from "../composables/useClickOutside";
import { useLatestDaily } from "../composables/useLatestDaily";
import { usePubSub } from "../composables/usePubSub";
import { useTheme } from "../composables/useTheme";
import type { NotificationPayload } from "../types/notification";
import logoUrl from "../assets/mulmo_bw.png";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    sandboxEnabled: boolean;
    geminiAvailable?: boolean;
    titleStyle?: CSSProperties;
  }>(),
  { geminiAvailable: true, titleStyle: () => ({}) },
);

const emit = defineEmits<{
  testQuery: [query: string];
  notificationNavigate: [action: NotificationPayload["action"]];
  openSettings: [];
  home: [];
}>();

// Settings button accessible name has to convey the `!` badge's
// meaning (missing API key) to screen-reader users — the badge
// itself is decorative (aria-hidden), so without this the a11y
// tree just announces "Settings" and the whole point of the
// attention signal is lost.
const settingsLabel = computed(() => (props.geminiAvailable ? t("sidebarHeader.settings") : t("sidebarHeader.settingsGeminiMissing")));

// Live socket.io connection status — when down, the chrome shows a
// `cloud_off` icon next to the bell so the user knows tool calls
// and session events won't reach the UI until the link recovers.
const { connected } = usePubSub();

// Theme toggle (auto / light / dark). Reflects current preference
// in the icon + tooltip; click cycles to the next.
const { theme, cycle: cycleTheme } = useTheme();
const themeIcon = computed(() => {
  if (theme.value === "dark") return "dark_mode";
  if (theme.value === "light") return "light_mode";
  return "brightness_auto";
});
const themeLabel = computed(() => {
  if (theme.value === "dark") return t("sidebarHeader.themeDark");
  if (theme.value === "light") return t("sidebarHeader.themeLight");
  return t("sidebarHeader.themeAuto");
});

const { openLatestDaily, loading: todayJournalLoading } = useLatestDaily();

const lockPopupOpen = ref(false);
const lockPopup = ref<{
  button: HTMLButtonElement | null;
  popup: HTMLDivElement | null;
} | null>(null);
const lockButton = computed(() => lockPopup.value?.button ?? null);
const lockPopupEl = computed(() => lockPopup.value?.popup ?? null);

const { handler } = useClickOutside({
  isOpen: lockPopupOpen,
  buttonRef: lockButton,
  popupRef: lockPopupEl,
});
onMounted(() => document.addEventListener("mousedown", handler));
onBeforeUnmount(() => document.removeEventListener("mousedown", handler));

function onNotificationOpen(isOpen: boolean): void {
  if (isOpen) lockPopupOpen.value = false;
}
</script>

<style scoped>
.gemini-missing-badge::before {
  content: "!";
}
</style>
