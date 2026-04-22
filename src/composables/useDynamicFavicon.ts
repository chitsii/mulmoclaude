// Dynamic favicon that changes color based on agent state (#470).
//
// Uses Canvas API to draw a rounded-square icon containing the
// MulmoClaude mascot logo. Agent state appears as a 2 px colored ring
// around the frame (so the mascot stays visible):
//   idle (gray) → running (blue, pulse) → done (green) → error (red)
//   notification badge (orange dot) overlaid when unread count > 0.
//
// The logo PNG is loaded once on first render via Vite's asset-URL
// import and cached as an HTMLImageElement. If it fails to decode we
// fall back to the earlier "M"-letter variant so the tab icon never
// disappears entirely.

import { watch, type Ref, type ComputedRef } from "vue";
import logoUrl from "../assets/mulmo_bw.png";

export const FAVICON_STATES = {
  idle: "idle",
  running: "running",
  done: "done",
  error: "error",
} as const;

export type FaviconState = (typeof FAVICON_STATES)[keyof typeof FAVICON_STATES];

const STATE_COLORS: Record<FaviconState, string> = {
  idle: "#6B7280", // gray-500
  running: "#3B82F6", // blue-500
  done: "#22C55E", // green-500
  error: "#EF4444", // red-500
};

const NOTIFICATION_DOT_COLOR = "#F97316"; // orange-500
const SIZE = 32;
const RADIUS = 6;
const RING_WIDTH = 2;

// Load the logo PNG once and memoize the decoded <img>. Multiple
// concurrent calls before the first resolve share the same promise so
// we don't kick off N redundant decodes during a burst of state
// changes. A failed load falls through to the "M" fallback for the
// rest of the session.
let logoImage: HTMLImageElement | null = null;
let logoLoadFailed = false;
let logoLoadPromise: Promise<HTMLImageElement> | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (logoImage) return Promise.resolve(logoImage);
  if (logoLoadPromise) return logoLoadPromise;
  logoLoadPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      logoImage = img;
      resolve(img);
    };
    img.onerror = (err) => {
      logoLoadFailed = true;
      reject(err instanceof Error ? err : new Error("favicon logo failed to load"));
    };
    img.src = logoUrl;
  });
  return logoLoadPromise;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, posX: number, posY: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(posX + radius, posY);
  ctx.lineTo(posX + width - radius, posY);
  ctx.quadraticCurveTo(posX + width, posY, posX + width, posY + radius);
  ctx.lineTo(posX + width, posY + height - radius);
  ctx.quadraticCurveTo(posX + width, posY + height, posX + width - radius, posY + height);
  ctx.lineTo(posX + radius, posY + height);
  ctx.quadraticCurveTo(posX, posY + height, posX, posY + height - radius);
  ctx.lineTo(posX, posY + radius);
  ctx.quadraticCurveTo(posX, posY, posX + radius, posY);
  ctx.closePath();
}

// Aspect-preserving letterbox: scale the logo to fit the inner frame
// without distorting the mascot, then center the leftover space. With
// a transparent PNG the leftover is transparent (white fill below);
// with the current opaque PNG the leftover matches the PNG's white
// background so the two blend seamlessly.
function drawLogoCentered(ctx: CanvasRenderingContext2D, img: HTMLImageElement, inset: number): void {
  const available = SIZE - inset * 2;
  const aspect = img.width / img.height;
  const drawW = aspect >= 1 ? available : available * aspect;
  const drawH = aspect >= 1 ? available / aspect : available;
  const drawX = inset + (available - drawW) / 2;
  const drawY = inset + (available - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

function drawStateRing(ctx: CanvasRenderingContext2D, state: FaviconState): void {
  // Ring sits ON the edge of the rounded square rather than inside, so
  // the full 32×32 is used for the mascot. `lineWidth = RING_WIDTH`
  // with a half-inset keeps strokes on-pixel.
  const half = RING_WIDTH / 2;
  ctx.strokeStyle = STATE_COLORS[state];
  ctx.lineWidth = RING_WIDTH;
  drawRoundedRect(ctx, half, half, SIZE - RING_WIDTH, SIZE - RING_WIDTH, RADIUS);
  ctx.stroke();

  // Running: a second inner ring at lower alpha reads as a subtle
  // glow / pulse cue at 32 px.
  if (state === FAVICON_STATES.running) {
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)"; // matches blue-500 state
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, 4, 4, SIZE - 8, SIZE - 8, Math.max(RADIUS - 2, 2));
    ctx.stroke();
  }
}

function drawNotificationDot(ctx: CanvasRenderingContext2D): void {
  const dotR = 5;
  const dotX = SIZE - dotR - 1;
  const dotY = dotR + 1;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = NOTIFICATION_DOT_COLOR;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Fallback for when the logo PNG fails to decode (or before the first
// decode completes). Same geometry as the previous implementation so
// the favicon never looks broken during the first paint.
function renderFallbackFavicon(ctx: CanvasRenderingContext2D, state: FaviconState, hasNotification: boolean): void {
  drawRoundedRect(ctx, 1, 1, SIZE - 2, SIZE - 2, RADIUS);
  ctx.fillStyle = STATE_COLORS[state];
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", SIZE / 2, SIZE / 2 + 1);

  if (hasNotification) drawNotificationDot(ctx);
}

function renderLogoFavicon(ctx: CanvasRenderingContext2D, img: HTMLImageElement, state: FaviconState, hasNotification: boolean): void {
  // Clip to the rounded square so the PNG's corners don't bleed
  // outside the frame.
  ctx.save();
  drawRoundedRect(ctx, 0, 0, SIZE, SIZE, RADIUS);
  ctx.clip();
  // White backing so transparent regions of the PNG (none today, but
  // future-proof) don't render with the browser's tab-bar color.
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawLogoCentered(ctx, img, RING_WIDTH);
  ctx.restore();

  drawStateRing(ctx, state);
  if (hasNotification) drawNotificationDot(ctx);
}

async function renderFavicon(state: FaviconState, hasNotification: boolean): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (!logoLoadFailed) {
    try {
      const img = await loadLogo();
      renderLogoFavicon(ctx, img, state, hasNotification);
      return canvas.toDataURL("image/png");
    } catch {
      // fall through — renderFallbackFavicon below handles it.
    }
  }

  renderFallbackFavicon(ctx, state, hasNotification);
  return canvas.toDataURL("image/png");
}

function applyFavicon(dataUrl: string): void {
  if (!dataUrl) return;
  let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = dataUrl;
}

export function useDynamicFavicon(opts: { state: Ref<FaviconState> | ComputedRef<FaviconState>; hasNotification: Ref<boolean> | ComputedRef<boolean> }): void {
  async function update(): Promise<void> {
    const dataUrl = await renderFavicon(opts.state.value, opts.hasNotification.value);
    applyFavicon(dataUrl);
  }

  watch(
    [opts.state, opts.hasNotification],
    () => {
      update().catch((err) => console.warn("[favicon] render failed", err));
    },
    { immediate: true },
  );
}
