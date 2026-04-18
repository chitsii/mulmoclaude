// Workspace-relative file paths used by the frontend.
//
// The server-side equivalent is `WORKSPACE_FILES` in
// `server/workspace/paths.ts`. These are kept in sync manually
// because the server module depends on `node:path`, which is
// unavailable in the browser.
//
// When a workspace path changes, update BOTH this file and
// `server/workspace/paths.ts`.

export const WORKSPACE_PATHS = {
  todosItems: "data/todos/todos.json",
  schedulerItems: "data/scheduler/items.json",
} as const;
