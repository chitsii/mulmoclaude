// Domain I/O: scheduler items
//   data/scheduler/items.json
//
// Sync API. Optional `root` for test DI.

import { WORKSPACE_DIRS, WORKSPACE_FILES } from "../../workspace/paths.js";
import { workspacePath } from "../../workspace/paths.js";
import { resolvePath } from "./workspace-io.js";
import { writeFileAtomicSync } from "./atomic.js";
import fs from "fs";

const root = (r?: string) => r ?? workspacePath;

export function loadSchedulerItems<T>(fallback: T, r?: string): T {
  const p = resolvePath(root(r), WORKSPACE_FILES.schedulerItems);
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      return fallback;
    }
    throw err;
  }
}

export function saveSchedulerItems(items: unknown, r?: string): void {
  const dir = resolvePath(root(r), WORKSPACE_DIRS.scheduler);
  fs.mkdirSync(dir, { recursive: true });
  writeFileAtomicSync(
    resolvePath(root(r), WORKSPACE_FILES.schedulerItems),
    JSON.stringify(items, null, 2),
  );
}
