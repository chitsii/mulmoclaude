// Skill scheduling (#357 Phase 2). Scans all discovered skills for
// `schedule:` frontmatter and registers matching ones with the
// task-manager. Each scheduled skill fires `startChat()` with the
// skill body as the message and the skill's `roleId` (or "general").
//
// Called once at server startup after the task-manager is created.
// Re-scanning on skill file changes is deferred — restart is the
// simplest refresh for now.

import { discoverSkills } from "./discovery.js";
import type { Skill } from "./types.js";
import type {
  ITaskManager,
  TaskSchedule,
} from "../../events/task-manager/index.js";
import { parseSkillFrontmatter } from "./parser.js";
import { log } from "../../system/logger/index.js";
import { readFileSync } from "fs";

export interface SkillSchedulerDeps {
  taskManager: ITaskManager;
  workspaceRoot: string;
  startChat: (params: {
    message: string;
    roleId: string;
    chatSessionId: string;
  }) => Promise<{ kind: string }>;
}

export async function registerScheduledSkills(
  deps: SkillSchedulerDeps,
): Promise<number> {
  const { taskManager, workspaceRoot, startChat } = deps;
  const skills = await discoverSkills({ workspaceRoot });
  let registered = 0;

  for (const skill of skills) {
    const schedule = readSkillSchedule(skill);
    if (!schedule) continue;

    const roleId = readSkillRoleId(skill) ?? "general";
    const taskId = `skill.${skill.name}`;

    taskManager.registerTask({
      id: taskId,
      description: `Scheduled skill: ${skill.name} — ${skill.description}`,
      schedule,
      run: async () => {
        const chatSessionId = crypto.randomUUID();
        log.info("skills", "running scheduled skill", {
          name: skill.name,
          roleId,
          chatSessionId,
        });
        const result = await startChat({
          message: `/${skill.name}`,
          roleId,
          chatSessionId,
        });
        log.info("skills", "scheduled skill completed", {
          name: skill.name,
          kind: result.kind,
        });
      },
    });

    log.info("skills", "registered scheduled skill", {
      name: skill.name,
      taskId,
      schedule: schedule.type,
      roleId,
    });
    registered++;
  }

  return registered;
}

function readSkillSchedule(skill: Skill): TaskSchedule | null {
  try {
    const raw = readFileSync(skill.path, "utf-8");
    const parsed = parseSkillFrontmatter(raw);
    if (!parsed?.schedule?.parsed) return null;

    const s = parsed.schedule.parsed;
    if (s.type === "daily") {
      return { type: "daily", time: s.time };
    }
    if (s.type === "interval") {
      return { type: "interval", intervalMs: s.intervalMs };
    }
    return null;
  } catch {
    return null;
  }
}

function readSkillRoleId(skill: Skill): string | null {
  try {
    const raw = readFileSync(skill.path, "utf-8");
    const parsed = parseSkillFrontmatter(raw);
    return parsed?.roleId ?? null;
  } catch {
    return null;
  }
}
