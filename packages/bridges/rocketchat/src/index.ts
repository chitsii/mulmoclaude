#!/usr/bin/env node
// @mulmobridge/rocketchat — Rocket.Chat bridge for MulmoClaude.
//
// Uses the REST API with a personal access token. Every poll interval the
// bridge lists direct-message rooms and fetches new messages per room,
// forwarding non-self messages to MulmoClaude and posting replies back.
// Outbound-only — no public URL needed.
//
// Required env vars:
//   ROCKETCHAT_URL      — server URL, e.g. https://rocket.example.com
//   ROCKETCHAT_USER_ID  — bot user ID (Avatar → My Account → Personal Access
//                         Tokens → copy "User ID")
//   ROCKETCHAT_TOKEN    — personal access token for the bot user
//
// Optional:
//   ROCKETCHAT_ALLOWED_USERS      — CSV of usernames allowed (empty = all)
//   ROCKETCHAT_POLL_INTERVAL_SEC  — poll interval seconds (default 5)

import "dotenv/config";
import { createBridgeClient, chunkText } from "@mulmobridge/client";

const TRANSPORT_ID = "rocketchat";
const MAX_MSG_LEN = 4_000;
const FETCH_TIMEOUT_MS = 15_000;

const baseUrl = (process.env.ROCKETCHAT_URL ?? "").replace(/\/$/, "");
const userId = process.env.ROCKETCHAT_USER_ID;
const authToken = process.env.ROCKETCHAT_TOKEN;
if (!baseUrl || !userId || !authToken) {
  console.error("ROCKETCHAT_URL, ROCKETCHAT_USER_ID, and ROCKETCHAT_TOKEN are required.\n" + "See README for setup instructions.");
  process.exit(1);
}

const allowedUsers = new Set(
  (process.env.ROCKETCHAT_ALLOWED_USERS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const allowAll = allowedUsers.size === 0;
const pollIntervalSec = Math.max(2, Number(process.env.ROCKETCHAT_POLL_INTERVAL_SEC) || 5);

const mulmo = createBridgeClient({ transportId: TRANSPORT_ID });
const apiBase = `${baseUrl}/api/v1`;

mulmo.onPush((pushEvent) => {
  postMessage(pushEvent.chatId, pushEvent.message).catch((err) => console.error(`[rocketchat] push send failed: ${err}`));
});

// ── REST helpers ────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

function isObj(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function authHeaders(): Record<string, string> {
  return {
    "X-Auth-Token": authToken!,
    "X-User-Id": userId!,
  };
}

async function rcGet(path: string, query?: Record<string, string>): Promise<JsonRecord> {
  const queryString = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : "";
  const res = await fetch(`${apiBase}${path}${queryString}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  return isObj(json) ? json : {};
}

async function rcPost(path: string, body: JsonRecord): Promise<JsonRecord> {
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  return isObj(json) ? json : {};
}

// ── Send / receive ──────────────────────────────────────────────

async function postMessage(roomId: string, text: string): Promise<void> {
  const chunks = chunkText(text, MAX_MSG_LEN);
  for (const chunk of chunks) {
    try {
      await rcPost("/chat.postMessage", { roomId, text: chunk });
    } catch (err) {
      console.error(`[rocketchat] postMessage error: ${err}`);
    }
  }
}

interface IncomingMessage {
  msgId: string;
  roomId: string;
  senderUsername: string;
  senderId: string;
  text: string;
  tsIso: string;
}

function parseMessage(raw: unknown, roomId: string): IncomingMessage | null {
  if (!isObj(raw)) return null;
  const msgId = typeof raw._id === "string" ? raw._id : "";
  const text = typeof raw.msg === "string" ? raw.msg : "";
  const user = isObj(raw.u) ? raw.u : null;
  const senderUsername = user && typeof user.username === "string" ? user.username : "";
  const senderId = user && typeof user._id === "string" ? user._id : "";
  const tsIso = typeof raw.ts === "string" ? raw.ts : new Date().toISOString();
  if (!msgId || !text || !senderUsername || !senderId) return null;
  return { msgId, roomId, senderUsername, senderId, text, tsIso };
}

async function handleIncoming(msg: IncomingMessage): Promise<void> {
  if (msg.senderId === userId) return; // ignore self
  if (!allowAll && !allowedUsers.has(msg.senderUsername)) {
    console.log(`[rocketchat] denied from=${msg.senderUsername}`);
    return;
  }
  console.log(`[rocketchat] message room=${msg.roomId} from=${msg.senderUsername} len=${msg.text.length}`);

  try {
    const ack = await mulmo.send(msg.roomId, msg.text);
    if (ack.ok) {
      await postMessage(msg.roomId, ack.reply ?? "");
    } else {
      const status = ack.status ? ` (${ack.status})` : "";
      await postMessage(msg.roomId, `Error${status}: ${ack.error ?? "unknown"}`);
    }
  } catch (err) {
    console.error(`[rocketchat] handleIncoming error: ${err}`);
  }
}

// ── Poll loop ───────────────────────────────────────────────────

async function listDmRoomIds(): Promise<string[]> {
  const result = await rcGet("/im.list", { count: "100" });
  const rooms = Array.isArray(result.ims) ? result.ims : [];
  return rooms.filter((room): room is JsonRecord => isObj(room) && typeof room._id === "string").map((room) => String(room._id));
}

async function pollRoom(roomId: string, oldestIso: string): Promise<string> {
  const result = await rcGet("/im.history", {
    roomId,
    oldest: oldestIso,
    inclusive: "false",
    count: "50",
  });
  const messages = Array.isArray(result.messages) ? result.messages : [];
  const sorted = [...messages].reverse(); // API returns newest-first
  let newestIso = oldestIso;
  for (const raw of sorted) {
    const parsed = parseMessage(raw, roomId);
    if (!parsed) continue;
    await handleIncoming(parsed);
    if (parsed.tsIso > newestIso) newestIso = parsed.tsIso;
  }
  return newestIso;
}

async function pollLoop(): Promise<void> {
  const cursors = new Map<string, string>();

  while (true) {
    try {
      const rooms = await listDmRoomIds();
      for (const roomId of rooms) {
        if (!cursors.has(roomId)) cursors.set(roomId, new Date().toISOString());
        try {
          const newestIso = await pollRoom(roomId, cursors.get(roomId)!);
          cursors.set(roomId, newestIso);
        } catch (err) {
          console.error(`[rocketchat] pollRoom ${roomId} error: ${err}`);
        }
      }
    } catch (err) {
      console.error(`[rocketchat] poll loop error: ${err}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, pollIntervalSec * 1000));
  }
}

// ── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("MulmoClaude Rocket.Chat bridge");
  console.log(`Server: ${baseUrl}`);
  console.log(`Allowlist: ${allowAll ? "(all)" : [...allowedUsers].join(", ")}`);
  console.log(`Poll interval: ${pollIntervalSec}s`);

  // Smoke-test auth by hitting /me
  const profile = await rcGet("/me");
  console.log(`[rocketchat] authenticated as ${String(profile.username)}`);

  await pollLoop();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
