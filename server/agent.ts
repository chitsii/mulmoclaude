import { spawn, type ChildProcess } from "child_process";
import { mkdir, writeFile, unlink } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { isDockerAvailable } from "./docker.js";
import { refreshCredentials, isAuthError } from "./credentials.js";
import type { Role } from "../src/config/roles.js";
import { loadAllRoles } from "./roles.js";
import { buildSystemPrompt } from "./agent/prompt.js";
import {
  getActivePlugins,
  buildMcpConfig,
  buildCliArgs,
} from "./agent/config.js";
import {
  parseStreamEvent,
  type AgentEvent,
  type RawStreamEvent,
} from "./agent/stream.js";

function spawnClaude(
  args: string[],
  useDocker: boolean,
  workspacePath: string,
): ChildProcess {
  const toDockerPath = (p: string) => p.replace(/\\/g, "/");
  const extraHosts: string[] =
    process.platform === "linux"
      ? ["--add-host", "host.docker.internal:host-gateway"]
      : [];

  const uid = process.getuid?.() ?? 1000;
  const gid = process.getgid?.() ?? 1000;
  const projectRoot = process.cwd();
  return useDocker
    ? spawn(
        "docker",
        [
          "run",
          "--rm",
          "--cap-drop",
          "ALL",
          "--user",
          `${uid}:${gid}`,
          "-e",
          "HOME=/home/node",
          "-v",
          `${toDockerPath(projectRoot)}/node_modules:/app/node_modules:ro`,
          "-v",
          `${toDockerPath(projectRoot)}/server:/app/server:ro`,
          "-v",
          `${toDockerPath(projectRoot)}/src:/app/src:ro`,
          "-v",
          `${toDockerPath(workspacePath)}:/home/node/mulmoclaude`,
          "-v",
          `${toDockerPath(homedir())}/.claude:/home/node/.claude`,
          "-v",
          `${toDockerPath(homedir())}/.claude.json:/home/node/.claude.json`,
          ...extraHosts,
          "mulmoclaude-sandbox",
          "claude",
          ...args,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      )
    : spawn("claude", args, {
        cwd: workspacePath,
        stdio: ["ignore", "pipe", "pipe"],
      });
}

export async function* runAgent(
  message: string,
  role: Role,
  workspacePath: string,
  sessionId: string,
  port: number,
  claudeSessionId?: string,
  pluginPrompts?: Record<string, string>,
  systemPrompt?: string,
): AsyncGenerator<AgentEvent> {
  const activePlugins = getActivePlugins(role);
  const hasMcp = activePlugins.length > 0;
  const useDocker = await isDockerAvailable();

  const containerWorkspacePath = "/home/node/mulmoclaude";
  const fullSystemPrompt = buildSystemPrompt({
    role,
    workspacePath: useDocker ? containerWorkspacePath : workspacePath,
    pluginPrompts,
    systemPrompt,
  });

  // Compute MCP config paths — host path for writing/cleanup,
  // arg path for what gets passed to the claude CLI (container path if docker).
  let mcpConfigHostPath: string;
  let mcpConfigArgPath: string;
  if (useDocker) {
    const mcpConfigDir = join(workspacePath, ".mulmoclaude");
    await mkdir(mcpConfigDir, { recursive: true });
    mcpConfigHostPath = join(mcpConfigDir, `mcp-${sessionId}.json`);
    mcpConfigArgPath = `/home/node/mulmoclaude/.mulmoclaude/mcp-${sessionId}.json`;
  } else {
    mcpConfigHostPath = join(tmpdir(), `mulmoclaude-mcp-${sessionId}.json`);
    mcpConfigArgPath = mcpConfigHostPath;
  }

  if (hasMcp) {
    const mcpConfig = buildMcpConfig({
      sessionId,
      port,
      activePlugins,
      roleIds: loadAllRoles().map((r) => r.id),
      useDocker,
    });
    await writeFile(mcpConfigHostPath, JSON.stringify(mcpConfig, null, 2));
  }

  const args = buildCliArgs({
    systemPrompt: fullSystemPrompt,
    activePlugins,
    claudeSessionId,
    message,
    mcpConfigPath: hasMcp ? mcpConfigArgPath : undefined,
  });

  // On macOS sandbox, if the first attempt fails with a 401 auth error,
  // refresh credentials from Keychain and retry. Auth errors cause the CLI
  // to fail fast with no useful events, so pre-checking avoids the need to
  // buffer the entire stream.
  const canRetryAuth = useDocker && process.platform === "darwin";

  try {
    yield* streamAgent(args, useDocker, workspacePath, canRetryAuth);
  } finally {
    if (hasMcp) unlink(mcpConfigHostPath).catch(() => {});
  }
}

async function* streamAgent(
  args: string[],
  useDocker: boolean,
  workspacePath: string,
  canRetryAuth: boolean,
): AsyncGenerator<AgentEvent> {
  const proc = spawnClaude(args, useDocker, workspacePath);

  let stderrOutput = "";
  let authErrorDetected = false;

  try {
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrOutput += chunk.toString();
    });

    let buffer = "";
    for await (const chunk of proc.stdout!) {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: RawStreamEvent;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        for (const agentEvent of parseStreamEvent(event)) {
          if (
            canRetryAuth &&
            (agentEvent.type === "text" || agentEvent.type === "error") &&
            isAuthError(agentEvent.message)
          ) {
            authErrorDetected = true;
          }
          yield agentEvent;
        }
      }
    }

    const exitCode = await new Promise<number>((resolve) =>
      proc.on("close", resolve),
    );

    if (canRetryAuth && !authErrorDetected && isAuthError(stderrOutput)) {
      authErrorDetected = true;
    }

    if (authErrorDetected) {
      console.log(
        "[sandbox] Authentication error detected — refreshing credentials and retrying...",
      );
      const refreshed = await refreshCredentials();
      if (refreshed) {
        yield* streamAgent(args, useDocker, workspacePath, false);
        return;
      }
    }

    if (exitCode !== 0) {
      yield {
        type: "error",
        message: stderrOutput || `claude exited with code ${exitCode}`,
      };
    }
  } finally {
    if (!proc.killed) proc.kill();
  }
}
