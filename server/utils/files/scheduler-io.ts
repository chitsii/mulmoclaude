// Domain I/O: scheduler items
//   data/scheduler/items.json
//
// Sync API. Optional `root` for test DI.

import { WORKSPACE_FILES } from "../../workspace/paths.js";
import { workspacePath } from "../../workspace/paths.js";
import { resolvePath } from "./workspace-io.js";
import fs from "fs";

const SCHEDULER_DIR = "data/scheduler";
const root = (r?: string) => r ?? workspacePath;

export function loadSchedulerItems<T>(fallback: T, r?: string): T {
  const p = resolvePath(root(r), WORKSPACE_FILES.schedulerItems);
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function saveSchedulerItems(items: unknown, r?: string): void {
  const dir = resolvePath(root(r), SCHEDULER_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const p = resolvePath(root(r), WORKSPACE_FILES.schedulerItems);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, p);
}
