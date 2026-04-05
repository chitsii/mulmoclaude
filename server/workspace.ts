import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "templates");

export const workspacePath = path.join(os.homedir(), "mulmoclaude");

const SUBDIRS = [
  "chat",
  "todos",
  "calendar",
  "contacts",
  "scheduler",
  "roles",
  "stories",
];

export function initWorkspace(): string {
  // Create directory structure if needed
  fs.mkdirSync(workspacePath, { recursive: true });
  for (const dir of SUBDIRS) {
    fs.mkdirSync(path.join(workspacePath, dir), { recursive: true });
  }

  // Create memory.md if it doesn't exist
  const memoryFile = path.join(workspacePath, "memory.md");
  if (!fs.existsSync(memoryFile)) {
    fs.writeFileSync(
      memoryFile,
      "# Memory\n\nDistilled facts about you and your work.\n",
    );
  }

  // Create about.md if it doesn't exist
  const aboutFile = path.join(workspacePath, "about.md");
  if (!fs.existsSync(aboutFile)) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, "about.md"), aboutFile);
  }

  // Git init if not already a repo
  const gitDir = path.join(workspacePath, ".git");
  if (!fs.existsSync(gitDir)) {
    execSync("git init", { cwd: workspacePath });
    console.log(`Initialized git repository in ${workspacePath}`);
  }

  console.log(`Workspace: ${workspacePath}`);
  return workspacePath;
}
