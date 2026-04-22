<template>
  <div class="w-full h-full flex flex-col bg-white">
    <div class="flex-shrink-0 px-4 py-2 border-b border-gray-100 bg-gray-50">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              <button
                v-for="size in [2, 5, 10, 20]"
                :key="size"
                :class="[
                  'w-8 h-8 rounded border-2 transition-colors',
                  brushSize === size ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white hover:bg-gray-50',
                ]"
                @click="brushSize = size"
              >
                <div
                  :class="'bg-gray-800 rounded-full mx-auto'"
                  :style="{
                    width: Math.max(2, size * 1) + 'px',
                    height: Math.max(2, size * 1) + 'px',
                  }"
                ></div>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input v-model="brushColor" type="color" class="w-12 h-8 rounded border border-gray-300" />
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button class="w-8 h-8 flex items-center justify-center rounded border-2 border-gray-300 bg-white hover:bg-gray-50" title="Undo" @click="undo">
            <span class="material-icons text-sm">undo</span>
          </button>
          <button class="w-8 h-8 flex items-center justify-center rounded border-2 border-gray-300 bg-white hover:bg-gray-50" title="Redo" @click="redo">
            <span class="material-icons text-sm">redo</span>
          </button>
          <button class="w-8 h-8 flex items-center justify-center rounded border-2 border-red-300 bg-white hover:bg-red-50" title="Clear" @click="clear">
            <span class="material-icons text-sm">delete</span>
          </button>
        </div>
      </div>
    </div>

    <div ref="containerRef" class="flex-1 p-4 overflow-hidden">
      <VueDrawingCanvas
        v-if="isSized"
        ref="canvasRef"
        :key="`${selectedResult?.uuid || 'default'}-${canvasRenderKey}`"
        v-model:image="canvasImage"
        :width="canvasWidth"
        :height="canvasHeight"
        :stroke-type="'dash'"
        :line-cap="'round'"
        :line-join="'round'"
        :fill-shape="false"
        :eraser="false"
        :line-width="brushSize"
        :color="brushColor"
        :background-color="'#FFFFFF'"
        :background-image="backgroundImage"
        :watermark="undefined"
        save-as="png"
        :styles="{
          border: '1px solid #ddd',
          borderRadius: '8px',
        }"
        :lock="false"
        @mouseup="handleDrawingEnd"
        @touchend="handleDrawingEnd"
      />
      <div class="flex items-center gap-2 flex-wrap mt-3">
        <span class="text-xs text-gray-500 mr-1">Style:</span>
        <button
          v-for="style in artStyles"
          :key="style.id"
          class="px-3 py-1.5 text-xs rounded-full border border-gray-300 bg-white hover:bg-blue-50 hover:border-blue-400 transition-colors"
          @click="applyStyle(style)"
        >
          {{ style.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import VueDrawingCanvas from "vue-drawing-canvas";
import type { ToolResult } from "gui-chat-protocol/vue";
import type { ImageToolData } from "./definition";
import { apiPut } from "../../utils/api";
import { API_ROUTES } from "../../config/apiRoutes";
import { resolveImageSrc } from "../../utils/image/resolve";
import { bumpImage } from "../../utils/image/cacheBust";

const props = defineProps<{
  selectedResult: ToolResult<ImageToolData> | null;
  sendTextMessage?: (text: string) => void;
}>();

const artStyles = [
  { id: "ghibli", label: "Ghibli" },
  { id: "ukiyoe", label: "Ukiyoe" },
  { id: "sumie", label: "Sumi-e" },
  { id: "picasso", label: "Picasso" },
  { id: "gogh", label: "Van Gogh" },
  { id: "photo", label: "Photo-realistic" },
  { id: "watercolor", label: "Watercolor" },
  { id: "popart", label: "Pop Art" },
  { id: "american", label: "American Comic" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "pencilsketch", label: "Pencil Sketch" },
  { id: "pixelart", label: "Pixel Art" },
];

const applyStyle = (style: { id: string; label: string }) => {
  props.sendTextMessage?.(`Turn my drawing on the canvas into a ${style.label} style image.`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const canvasRef = ref<any>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasImage = ref("");
const brushSize = ref(5);
const brushColor = ref("#000000");
const canvasWidth = ref(0);
const canvasHeight = ref(0);
const canvasRenderKey = ref(0);
// Gates the child render until the container has been measured. If we
// mount at a default 800×600 and then resize to fit the real container
// a tick later, the child's remount races its in-flight background-
// image fetch and the canvas ends up blank on reload.
const isSized = ref(false);

// The PNG on disk is the source of truth. The path is baked into
// the tool result at openCanvas time (server-allocated), so reload
// finds the file with zero client→server sync. Every stroke PUTs
// back to this same path.
const imagePath = computed(() => {
  const stored = props.selectedResult?.data?.imageData;
  if (!stored || stored.startsWith("data:")) return "";
  return stored;
});

// Per-mount cache buster for the VueDrawingCanvas child. The URL
// must be stable for the lifetime of one canvas instance — if it
// changes while the child is alive (e.g. from a post-save bump),
// the library nulls its cached `loadedImage` and the next redraw
// races a fresh re-fetch against stroke painting, blanking the
// canvas. Tying the token to `canvasRenderKey` (which increments
// when we explicitly remount via :key on resize) gives us fresh
// bytes on page reload and on resize, without mid-session churn.
const setupTime = Date.now();
const backgroundImage = computed(() => {
  if (!imagePath.value) return undefined;
  const base = resolveImageSrc(imagePath.value);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}mt=${setupTime}-${canvasRenderKey.value}`;
});

let uploadInFlight = false;
let pendingSave = false;

const undo = () => {
  if (!canvasRef.value) return;
  try {
    canvasRef.value.undo();
    setTimeout(saveDrawing, 50);
  } catch (error) {
    console.warn("Undo operation failed:", error);
  }
};

const redo = () => {
  if (!canvasRef.value) return;
  try {
    canvasRef.value.redo();
    setTimeout(saveDrawing, 50);
  } catch (error) {
    console.warn("Redo operation failed:", error);
  }
};

const clear = () => {
  if (!canvasRef.value) return;
  try {
    canvasRef.value.reset();
    saveDrawing();
  } catch (error) {
    console.warn("Clear operation failed:", error);
  }
};

const handleDrawingEnd = () => {
  saveDrawing();
};

// Grab the current bitmap and PUT it back to the pre-allocated
// file. No result mutation — the path is fixed from canvas
// creation, so nothing upstream needs to know about saves.
const saveDrawing = async (): Promise<void> => {
  if (!canvasRef.value || !imagePath.value) return;
  if (uploadInFlight) {
    pendingSave = true;
    return;
  }
  uploadInFlight = true;
  try {
    const imageDataUri: string = await canvasRef.value.save();
    const filename = imagePath.value.replace(/^artifacts\/images\//, "").replace(/^images\//, "");
    const result = await apiPut<{ path: string }>(API_ROUTES.image.update.replace(":filename", filename), { imageData: imageDataUri });
    if (!result.ok) throw new Error(`PUT failed: ${result.error}`);
    bumpImage(imagePath.value);
  } catch (error) {
    console.error("Failed to save drawing:", error);
  } finally {
    uploadInFlight = false;
    if (pendingSave) {
      pendingSave = false;
      void saveDrawing();
    }
  }
};

const updateCanvasSize = () => {
  const container = containerRef.value;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const padding = 32;
  const newWidth = Math.floor(containerRect.width - padding);
  const newHeight = Math.floor((newWidth * 9) / 16);
  if (newWidth <= 0) return;
  if (newWidth === canvasWidth.value && newHeight === canvasHeight.value) return;
  canvasWidth.value = newWidth;
  canvasHeight.value = newHeight;
  if (!isSized.value) return;
  // Post-initial resize: bump the shared preview cache-buster and
  // remount the canvas child so it picks up the latest saved bitmap
  // at the new dimensions.
  if (imagePath.value) bumpImage(imagePath.value);
  canvasRenderKey.value++;
};

onMounted(async () => {
  await nextTick();
  updateCanvasSize();
  // First paint now that we know the size.
  isSized.value = true;
  window.addEventListener("resize", updateCanvasSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateCanvasSize);
});
</script>
