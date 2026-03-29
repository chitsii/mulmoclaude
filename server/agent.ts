import { spawn } from "child_process";
import type { Role } from "../src/config/roles.js";

export type AgentEvent =
  | { type: "status"; message: string }
  | { type: "text"; message: string }
  | { type: "tool_result"; result: unknown }
  | { type: "error"; message: string };

export async function* runAgent(
  message: string,
  role: Role,
  workspacePath: string,
): AsyncGenerator<AgentEvent> {
  const systemPrompt = [
    role.prompt,
    `Workspace directory: ${workspacePath}`,
    `Today's date: ${new Date().toISOString().split("T")[0]}`,
  ].join("\n\n");

  const proc = spawn(
    "claude",
    ["-p", message, "--output-format", "stream-json", "--verbose", "--system-prompt", systemPrompt],
    { cwd: workspacePath, stdio: ["ignore", "pipe", "pipe"] },
  );

  let stderrOutput = "";
  proc.stderr.on("data", (chunk: Buffer) => {
    stderrOutput += chunk.toString();
  });

  let buffer = "";
  for await (const chunk of proc.stdout) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.type === "assistant") {
        yield { type: "status", message: "Thinking..." };
      } else if (event.type === "result" && typeof event.result === "string") {
        yield { type: "text", message: event.result };
      }
    }
  }

  const exitCode = await new Promise<number>((resolve) => proc.on("close", resolve));

  if (exitCode !== 0) {
    yield { type: "error", message: stderrOutput || `claude exited with code ${exitCode}` };
  }
}
