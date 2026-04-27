# presentMulmoScript: load-by-path + background movie generation

## Goal

Extend the `presentMulmoScript` tool so it can:

1. **Re-display an already-saved MulmoScript** by passing a file path (instead of always resending the full JSON), and
2. **Optionally start movie generation in the background** when the tool is invoked, so the user does not have to open the canvas view to kick it off.

Both are **opt-in additions** — existing call sites that pass a full `script` object continue to work unchanged.

## Tool arguments — the full picture

The current tool takes `{ script, filename? }`. The new shape adds two optional fields and turns `script` itself into "optional but required when `filePath` is absent":

| Arg | Type | Required | Meaning |
|---|---|---|---|
| `script` | `object` (MulmoScript JSON) | one of `script` / `filePath` | Full script JSON. Use when **creating a new** presentation. Server saves it to disk and returns `{ script, filePath }`. |
| `filePath` | `string` | one of `script` / `filePath` | Path to an existing `.mulmoscript.json` file inside the workspace. Use when **re-displaying** a previously created presentation. Server reads + validates the file and returns `{ script, filePath }`. |
| `filename` | `string` | optional | Only meaningful with `script`. Defaults to a slug of the title. Ignored when `filePath` is given. |
| `autoGenerateMovie` | `boolean` | optional, **default `false`** | When `true`, the server kicks off movie generation in the background after save / load. The user does not need to open the view; progress is tracked through the existing `pendingGenerations` channel. |

### "exactly one of script / filePath"

JSON Schema cannot cleanly express "exactly one of these two optional fields", so the contract is enforced in two places:

- **Tool description** spells out the rule plainly (Claude is the primary enforcer).
- **Server endpoint** validates the request and rejects with a clear error if both or neither are present.

### Three canonical invocations

```jsonc
// 1. Create + present (current behaviour, unchanged)
{ "script": { "$mulmocast": { "version": "1.1" }, "title": "...", ... } }

// 2. Re-display an existing script
{ "filePath": "artifacts/mulmoscripts/the-life-of-a-star.mulmoscript.json" }

// 3. Re-display AND start movie generation in the background
{
  "filePath": "artifacts/mulmoscripts/the-life-of-a-star.mulmoscript.json",
  "autoGenerateMovie": true
}

// 4. Create + present + start movie generation in the background
{
  "script": { ... },
  "autoGenerateMovie": true
}
```

## Server changes

### `filePath` mode — safety guards

When `filePath` is supplied, before the file is read:

1. `path.resolve(filePath)` to normalize.
2. Ensure resolved path's prefix is the workspace root (`WORKSPACE_PATHS`-derived).
3. After `fs.realpath`, repeat the workspace-prefix check (defends against symlinks pointing outside).
4. Reject anything whose extension is not `.json`.
5. Read, `JSON.parse`, validate against `mulmoScriptSchema`. Return `{ script, filePath }` on success; structured error otherwise.

No directory restriction beyond the workspace root.

### `autoGenerateMovie` — background generation

The current `mulmoScript.generateMovie` route streams SSE to the open view. We add a non-streaming sibling, e.g. `mulmoScript.generateMovieBackground`, that:

- POST returns 200 immediately (no SSE).
- Internally runs the same generation pipeline, but reports progress through the **session `pendingGenerations` channel** that the View already watches. (The existing `reflectGenerationStart` / `reflectGenerationFinish` handlers in `View.vue` will pick the work up automatically when the view mounts later.)
- On per-beat completion, emits `beatImage` / `beatAudio` finish events so the existing watcher reloads each artifact off disk.
- On terminal error, persists a sidecar (`<filename>.error.txt` next to the script) since there is no synchronous client to surface an `alert()` to.
- Guards against double-start by rejecting if a `movie` `pendingGeneration` already exists for this `filePath`.

The interactive **Generate Movie** button in the View should be refactored to share the same internal generation function — only the transport (SSE vs background fire-and-forget) differs.

## Frontend changes

### Tool plugin (`src/plugins/presentMulmoScript/index.ts`)

`execute()` becomes:

1. POST to `mulmoScript.save` (when `script` is present) **or** `mulmoScript.load` (when `filePath` is present) — pick one based on args.
2. If `autoGenerateMovie === true` and the save / load succeeded, POST to `mulmoScript.generateMovieBackground` with the resulting `filePath`. Fire-and-forget — do not await on the actual movie work.
3. Return `{ script, filePath }` as before.

### View (`src/plugins/presentMulmoScript/View.vue`)

**No changes required.** The View consumes `{ script, filePath }` and the existing `pendingGenerations` watcher handles the case where movie generation is already in flight when the view mounts. Spinners and final reload are automatic.

## Tool description update

The `description` field in `definition.ts` gains a short section above the existing JSON schema explaining:

- "Pass `script` to create-and-present a new MulmoScript."
- "Pass `filePath` (workspace-relative path to an existing `.mulmoscript.json`) to re-display an already-saved script — much cheaper than re-sending the whole JSON."
- "Set `autoGenerateMovie: true` only when the user has explicitly asked for the movie. Movie generation is expensive (multiple image + audio API calls + video encoding); never default it on."

## Out of scope (for this plan)

- Listing / browsing saved MulmoScripts in the UI (a separate "open recent" affordance) — Claude can already locate paths via the file tools.
- Per-script error inboxes — the sidecar `.error.txt` is the v1 surface for background failures.
- Resuming a partially-completed background movie generation across server restarts.

## Risks & open questions

- **Path validation drift**: if other routes already do workspace-root validation, consolidate into one helper rather than re-implementing here.
- **Error UX for background failures**: surface the sidecar file's existence somehow (badge in the view header? toast on next session activity?) — confirm with the user before settling.
- **Double-start race**: between the tool's `execute()` posting to `generateMovieBackground` and a user clicking the View's "Generate Movie" button. The pending-entry guard on the server handles this, but the UI button should disable itself while a `movie` pending entry exists for this script (it likely already does via `movieGenerating`).
