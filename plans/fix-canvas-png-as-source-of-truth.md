# Canvas: PNG File as Source of Truth

## Problem

After reloading the page, the user's drawing on the canvas disappears.
The PNG file is still on disk in `~/mulmoclaude/artifacts/images/`, but:

1. The session's persisted `tool_result` for `openCanvas` has no
   `data.imageData` — `executeOpenCanvas()` in
   `src/plugins/canvas/definition.ts` returns only `{ message,
   instructions, title }`. So reload can't find the file.
2. The `viewState.drawingState` (strokes, brush settings) is emitted
   client-side via `emit("updateResult", …)` on every autosave, but
   that only mutates the in-memory session — `handleUpdateResult` in
   `src/App.vue` is just a client-only `Object.assign`. Nothing writes
   it back to the server's session jsonl.

Result: on reload, the canvas opens blank, `imagePath` starts empty,
and the next stroke creates a **new** PNG via `POST /api/images`,
orphaning the old one.

## Design: Stop Persisting Vectors

The drawing canvas currently tries to persist two representations:

- The **raster** (PNG file on disk, via `POST`/`PUT /api/images`).
- The **vectors** (stroke array + brush settings in
  `viewState.drawingState`), which never made it to disk anyway.

Since only the raster survives, make it the sole source of truth:

- Pre-allocate the PNG path when `openCanvas` is invoked. Bake the
  path into the tool result's `data.imageData` so it's persisted in
  the session jsonl for free (no client → server update required).
- On reload, the canvas View reads `data.imageData` and loads the
  file as its initial image.
- Every stroke still autosaves via `PUT` to that same file (existing
  behavior). No `emit("updateResult", …)` needed.
- Drop `CanvasDrawingState`, `initialStrokes`, `restoreDrawingState`,
  and the `viewState.drawingState` plumbing entirely.

### What we lose

- Stroke-level undo/redo across reload. Already lost today — the
  strokes array was never persisted to the server.
- Brush size/color restoration on reload. Acceptable — that's a UI
  preference, not drawing content.

### What we gain

- Reload shows the drawing.
- No orphaned PNGs (autosaves always `PUT` the same file).
- No client → server sync path for canvas state.
- Simpler client code (removes ~40 lines of strokes / viewState
  handling).

## Implementation

### 1. Server: pre-allocate the PNG file in the `/api/canvas` route

`server/api/routes/plugins.ts` (around line 267):

```ts
router.post(
  API_ROUTES.plugins.canvas,
  wrapPluginExecute(async () => {
    const imagePath = await saveImage(BLANK_PNG_BASE64);
    const base = await executeOpenCanvas();
    return { ...base, data: { imageData: imagePath, prompt: "" } };
  }),
);
```

- `saveImage` is already imported from `../../utils/files/image-store.js`.
- `BLANK_PNG_BASE64` is a small constant — a 1×1 transparent PNG, or
  an 800×600 white PNG matching the canvas default. Define it in the
  route file or in `image-store.ts`.
- Must be a real file on disk: `overwriteImage` uses `resolveWithinRoot`
  (`server/utils/files/safe.ts:93-106`), which returns `null` when the
  target doesn't exist, so the first `PUT` would fail otherwise.

### 2. Client: View loads PNG, drops vector handling

`src/plugins/canvas/View.vue`:

- Initialize `imagePath.value` from `props.selectedResult.data.imageData`
  unconditionally (it's always set now — strip the data-URL guard).
- Pass the resolved image URL to `VueDrawingCanvas`:

  ```ts
  const initialImage = computed(() =>
    imagePath.value ? resolveImageSrc(imagePath.value) : "",
  );
  ```

  ```html
  :initial-image="initialImage"
  ```

- Delete `CanvasDrawingState`, `initialStrokes`, `restoreDrawingState`,
  the `selectedResult` watcher, and the `emit("updateResult", …)` call
  inside `saveDrawingState`.
- `saveDrawingState` simplifies to: snapshot canvas bitmap → `PUT`
  overwrite → done. No result mutation, no viewState, no strokes.
- Keep the `uploadInFlight` / `pendingSave` queue so concurrent strokes
  don't fire overlapping uploads. Drop the boolean return type — no
  caller needs it after the previous `applyStyle` fix.

### 3. Definition: shrink the shape

`src/plugins/canvas/definition.ts`:

- Remove the `CanvasDrawingState` interface.
- `executeOpenCanvas` is now thin (message/instructions/title only); the
  route wrapper adds `data`. Leave `executeOpenCanvas` alone or inline
  it into the wrapper — whichever reads cleaner.

### 4. Cache-busting for live re-render

`ImagePreview` and `ImageView` render `<img :src="resolveImageSrc(...)">`.
Since `PUT` overwrites the same URL, the browser caches it — so the
Preview/stack-view thumbnail won't refresh mid-session.

Pick one:

- **Client-side query token** (preferred, zero server change):
  `resolveImageSrc` gains an optional `bustKey?: number` arg; the View
  bumps a reactive counter on each `PUT` and passes it. The token lives
  only in the DOM, never in persisted state.
- **Server `Cache-Control` header** on the `/api/files/raw` endpoint
  when the path is under `artifacts/images/`. Simpler but affects every
  image consumer.

### 5. `VueDrawingCanvas` initial-image sanity check

The component's `:initial-image` prop is documented as accepting either
a strokes array or an image data URL. Behavior with a plain URL (e.g.
`/api/files/raw?path=…`) is less certain — the component may need the
bitmap inlined as a data URL.

Before committing to the URL path:

1. Implement and load the canvas with a URL.
2. If the image doesn't paint, fetch the bytes in the View
   (`fetch(url) → blob → FileReader.readAsDataURL`) and pass the data
   URL to `:initial-image`. Adds one network round trip per mount;
   acceptable.

## Testing

- **Manual (primary)**:
  - Draw on canvas → reload → drawing reappears.
  - Draw → click Ghibli → request still carries image context.
  - Draw → draw again → only one PNG on disk per canvas instance
    (`ls ~/mulmoclaude/artifacts/images/` before and after).
  - Open two canvases in one session → each gets its own file; reload
    shows both.
- **Unit**: existing tests should pass unchanged. Nothing in `test/`
  currently asserts on `viewState.drawingState`.
- **E2E**: if there's a canvas Playwright fixture, update it to not
  inspect strokes. (Check `e2e/`.)

## Out of Scope

- Restoring stroke-level undo/redo across reload. Would require a
  separate per-session stroke log — not worth the complexity.
- Cross-tab live updates of the canvas bitmap. Today's Preview update
  is already best-effort; adding websocket-driven cache busting is a
  separate ask.

## File Touch List

- `server/api/routes/plugins.ts` — wrap `executeOpenCanvas` to
  pre-allocate and inject `data.imageData`.
- `server/utils/files/image-store.ts` — (optional) export
  `BLANK_PNG_BASE64` constant.
- `src/plugins/canvas/View.vue` — remove vector state, load PNG as
  initial image, drop `updateResult` emit, add cache-bust token.
- `src/plugins/canvas/definition.ts` — drop `CanvasDrawingState`.
- `src/utils/image/resolve.ts` — (optional) accept `bustKey` arg for
  cache-busting.
