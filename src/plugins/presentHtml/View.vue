<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="px-4 py-2 border-b border-gray-100 shrink-0 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700 truncate">{{ title ?? t("pluginPresentHtml.untitled") }}</span>
      <div class="flex items-center gap-2">
        <button
          class="px-2 py-1 text-xs rounded border border-gray-300 text-gray-500 hover:bg-gray-50 shrink-0"
          :title="t('pluginPresentHtml.saveAsPdf')"
          @click="printToPdf"
        >
          <span class="material-icons text-sm align-middle">picture_as_pdf</span>
          {{ t("pluginPresentHtml.pdf") }}
        </button>
        <button class="px-2 py-1 text-xs rounded border border-gray-300 text-gray-500 hover:bg-gray-50 shrink-0" @click="sourceOpen = !sourceOpen">
          {{ sourceOpen ? t("pluginPresentHtml.hideSource") : t("pluginPresentHtml.showSource") }}
        </button>
      </div>
    </div>
    <div v-if="sourceOpen" class="border-b border-gray-100 shrink-0">
      <textarea :value="html" readonly class="w-full text-xs text-gray-600 bg-gray-50 p-3 font-mono resize-none outline-none" rows="16" />
    </div>
    <!-- Sandbox: allow-scripts (CDN libs / inline JS), allow-modals
         (alert/confirm). NO `allow-same-origin` on purpose — with it,
         relative URLs in the AI's HTML (e.g. an accidental
         `<iframe src="/">`) resolve to MulmoClaude itself and the
         whole app loads recursively inside the canvas, melting
         memory + CPU. Without it, srcdoc is treated as null origin:
         CDN resources still load fine, but cross-origin features
         (parent DOM, fetch to /api/*, MulmoClaude cookies) are
         blocked — the correct sandbox posture for an AI-generated
         HTML preview. Matches the CodePen / JSFiddle convention. -->
    <iframe ref="iframeRef" :srcdoc="html" sandbox="allow-scripts allow-modals" class="flex-1 w-full border-0" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { ToolResultComplete } from "gui-chat-protocol/vue";
import type { PresentHtmlData } from "./index";
import { rewriteHtmlImageRefs } from "../../utils/image/rewriteHtmlImageRefs";

const { t } = useI18n();

const props = defineProps<{
  selectedResult: ToolResultComplete<PresentHtmlData>;
}>();

const PRINT_STYLE = `<style>@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { width: 100% !important; margin: 0 !important; padding: 8px !important; }
  @page { margin: 10mm; }
}</style>`;

// Without `allow-same-origin` on the iframe, the parent can no longer
// reach `iframe.contentWindow.print()` (cross-origin SecurityError).
// Inject a tiny postMessage listener into every AI HTML so the parent
// can ask the iframe to print itself. Uses a namespaced message type
// so it doesn't collide with the AI's own postMessage handlers.
//
// The "scr" + "ipt" string splits below are deliberate: a literal
// script-open or script-close token anywhere in this section would
// terminate the SFC's own script block — Vue's compiler is a textual
// scan with no awareness of JS string quoting. Even inside a comment,
// an unbroken closing token ends the section.
const PRINT_BRIDGE_SCRIPT =
  "<scr" +
  "ipt>" +
  '(function(){window.addEventListener("message",function(event){if(event&&event.data&&event.data.type==="mulmoclaude.print"){window.print();}});})();' +
  "</scr" +
  "ipt>";

const HEAD_INJECTION = `${PRINT_STYLE}${PRINT_BRIDGE_SCRIPT}`;

const data = computed(() => props.selectedResult.data);
// LLM-generated HTML often emits <img src="/artifacts/images/…"> using
// the web convention where `/` is the site root. Inside the iframe
// srcdoc that resolves to the SPA origin, which does not serve
// /artifacts. Route those through the workspace file server.
const rawHtml = computed(() => rewriteHtmlImageRefs(data.value?.html ?? ""));
const html = computed(() =>
  rawHtml.value.includes("</head>") ? rawHtml.value.replace("</head>", `${HEAD_INJECTION}</head>`) : `${HEAD_INJECTION}${rawHtml.value}`,
);
const title = computed(() => data.value?.title);

const sourceOpen = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);

function printToPdf() {
  // Cross-origin friendly print trigger: the iframe's bridge script
  // (injected via HEAD_INJECTION) listens for this message and calls
  // its own `window.print()`, which works because it's the iframe
  // calling print on itself — the cross-origin restriction only
  // prevents the parent from invoking print directly.
  iframeRef.value?.contentWindow?.postMessage({ type: "mulmoclaude.print" }, "*");
}
</script>
