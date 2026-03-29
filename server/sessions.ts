import { appendFile } from "fs/promises";

type SendFn = (data: unknown) => void;

interface Session {
  send: SendFn;
  resultsFilePath: string;
}

const sessions = new Map<string, Session>();

export function registerSession(
  id: string,
  send: SendFn,
  resultsFilePath: string,
): void {
  sessions.set(id, { send, resultsFilePath });
}

export function removeSession(id: string): void {
  sessions.delete(id);
}

export async function pushToSession(
  id: string,
  data: unknown,
): Promise<boolean> {
  const session = sessions.get(id);
  if (!session) return false;
  session.send(data);
  if (
    data &&
    typeof data === "object" &&
    (data as Record<string, unknown>).type === "tool_result"
  ) {
    const result = (data as Record<string, unknown>).result;
    await appendFile(
      session.resultsFilePath,
      JSON.stringify({ source: "tool", type: "tool_result", result }) + "\n",
    );
  }
  return true;
}
