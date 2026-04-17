// Domain I/O: todo items + status columns
//   data/todos/todos.json     — items
//   data/todos/columns.json   — status columns
//
// Sync API (existing callers are synchronous route handlers).
// Optional `root` for test DI.

import { WORKSPACE_FILES } from "../../workspace/paths.js";
import { workspacePath } from "../../workspace/paths.js";
import { resolvePath } from "./workspace-io.js";
import fs from "fs";

const TODOS_DIR = "data/todos";
const root = (r?: string) => r ?? workspacePath;

export function loadTodos<T>(fallback: T, r?: string): T {
  const p = resolvePath(root(r), WORKSPACE_FILES.todosItems);
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function saveTodos(items: unknown, r?: string): void {
  const dir = resolvePath(root(r), TODOS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const p = resolvePath(root(r), WORKSPACE_FILES.todosItems);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, p);
}

export function loadColumns<T>(fallback: T, r?: string): T {
  const p = resolvePath(root(r), WORKSPACE_FILES.todosColumns);
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function saveColumns(columns: unknown, r?: string): void {
  const dir = resolvePath(root(r), TODOS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const p = resolvePath(root(r), WORKSPACE_FILES.todosColumns);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(columns, null, 2));
  fs.renameSync(tmp, p);
}
