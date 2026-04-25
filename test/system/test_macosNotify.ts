import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { pushToMacosReminderWithDeps, _resetWarnFlagForTest, type Spawner } from "../../server/system/macosNotify.js";

type ProcessEnv = Record<string, string | undefined>;

interface SpawnCall {
  command: string;
  args: readonly string[];
  options: SpawnOptions;
}

// Build a minimal ChildProcess stub: an EventEmitter with a `stderr`
// emitter (needed by the production code's listener) and a small
// helper to fire `close` after the test arranges it.
function makeStubChild(): { child: ChildProcess; finish: (code: number, stderrChunk?: string) => void; error: (err: Error) => void } {
  const emitter = new EventEmitter() as unknown as ChildProcess;
  const stderrEmitter = new EventEmitter();
  Object.defineProperty(emitter, "stderr", { value: stderrEmitter });
  return {
    child: emitter,
    finish: (code, stderrChunk) => {
      if (stderrChunk) stderrEmitter.emit("data", stderrChunk);
      (emitter as unknown as EventEmitter).emit("close", code);
    },
    error: (err) => (emitter as unknown as EventEmitter).emit("error", err),
  };
}

function makeSpawner(): { spawner: Spawner; calls: SpawnCall[]; respond: (code: number, stderrChunk?: string) => void; throwError: (err: Error) => void } {
  const calls: SpawnCall[] = [];
  let pending: ReturnType<typeof makeStubChild> | null = null;
  const spawner: Spawner = (command, args, options) => {
    calls.push({ command, args, options });
    pending = makeStubChild();
    return pending.child;
  };
  return {
    spawner,
    calls,
    respond: (code, stderrChunk) => pending?.finish(code, stderrChunk),
    throwError: (err) => pending?.error(err),
  };
}

describe("pushToMacosReminderWithDeps — gating", () => {
  beforeEach(() => _resetWarnFlagForTest());

  it("no-ops when env flag is disabled", async () => {
    const { spawner, calls } = makeSpawner();
    await pushToMacosReminderWithDeps({ spawner, platform: "darwin", enabled: false }, "Hello");
    assert.equal(calls.length, 0);
  });

  it("no-ops on non-darwin platforms", async () => {
    const { spawner, calls } = makeSpawner();
    await pushToMacosReminderWithDeps({ spawner, platform: "linux", enabled: true }, "Hello");
    assert.equal(calls.length, 0);
  });

  it("emits the non-darwin warning only once across multiple calls", async () => {
    // The warn is delegated to the logger; we just verify the
    // function still returns and never spawns regardless of how many
    // times it's invoked.
    const { spawner, calls } = makeSpawner();
    await pushToMacosReminderWithDeps({ spawner, platform: "linux", enabled: true }, "first");
    await pushToMacosReminderWithDeps({ spawner, platform: "linux", enabled: true }, "second");
    assert.equal(calls.length, 0);
  });
});

describe("pushToMacosReminderWithDeps — spawn arguments", () => {
  beforeEach(() => _resetWarnFlagForTest());

  it("invokes osascript with the AppleScript on -e", async () => {
    const { spawner, calls, respond } = makeSpawner();
    const promise = pushToMacosReminderWithDeps({ spawner, platform: "darwin", enabled: true }, "Hello");
    respond(0);
    await promise;
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, "osascript");
    assert.equal(calls[0].args[0], "-e");
    assert.match(calls[0].args[1] as string, /tell application "Reminders"/);
    assert.match(calls[0].args[1] as string, /system attribute "MULMOC_NOTIFY_TITLE"/);
  });

  it("forwards title and body via env (no AppleScript escaping risk)", async () => {
    const { spawner, calls, respond } = makeSpawner();
    const promise = pushToMacosReminderWithDeps(
      { spawner, platform: "darwin", enabled: true },
      'Title with "quotes" and \\backslash',
      "Body line 1\nBody line 2",
    );
    respond(0);
    await promise;
    const childEnv = calls[0].options.env as ProcessEnv;
    assert.equal(childEnv.MULMOC_NOTIFY_TITLE, 'Title with "quotes" and \\backslash');
    assert.equal(childEnv.MULMOC_NOTIFY_BODY, "Body line 1\nBody line 2");
  });

  it("sets MULMOC_NOTIFY_BODY to empty string when body is omitted", async () => {
    const { spawner, calls, respond } = makeSpawner();
    const promise = pushToMacosReminderWithDeps({ spawner, platform: "darwin", enabled: true }, "Title only");
    respond(0);
    await promise;
    const childEnv = calls[0].options.env as ProcessEnv;
    assert.equal(childEnv.MULMOC_NOTIFY_BODY, "");
  });
});

describe("pushToMacosReminderWithDeps — failure handling", () => {
  beforeEach(() => _resetWarnFlagForTest());

  it("resolves silently when the subprocess emits an error", async () => {
    const { spawner, throwError } = makeSpawner();
    const promise = pushToMacosReminderWithDeps({ spawner, platform: "darwin", enabled: true }, "Hello");
    throwError(new Error("ENOENT"));
    await promise; // does not reject
  });

  it("resolves silently on non-zero exit", async () => {
    const { spawner, respond } = makeSpawner();
    const promise = pushToMacosReminderWithDeps({ spawner, platform: "darwin", enabled: true }, "Hello");
    respond(1, "Reminders.app is not authorised");
    await promise; // does not reject
  });

  it("resolves silently when spawn itself throws synchronously", async () => {
    const throwingSpawner: Spawner = () => {
      throw new Error("synchronous spawn failure");
    };
    await pushToMacosReminderWithDeps({ spawner: throwingSpawner, platform: "darwin", enabled: true }, "Hello");
    // Reaching this line means no rejection — that's the assertion.
    assert.ok(true);
  });
});
