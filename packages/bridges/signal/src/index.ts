#!/usr/bin/env node
// @mulmobridge/signal — Signal bridge for MulmoClaude.
//
// Talks to a running signal-cli-rest-api daemon (https://github.com/
// bbernhard/signal-cli-rest-api) — typically a local Docker container.
// Opens a WebSocket for incoming messages and POSTs outgoing replies
// via the daemon's REST endpoint. All traffic is local (bridge ↔ daemon),
// then the daemon handles the actual Signal network connection.
//
// Required env vars:
//   SIGNAL_API_URL — daemon base URL, e.g. http://localhost:8080
//   SIGNAL_NUMBER  — bot's registered Signal number in E.164 form,
//                    e.g. +81901234567
//
// Optional:
//   SIGNAL_ALLOWED_NUMBERS — CSV of sender numbers allowed (empty = all)

import "dotenv/config";
import WebSocket from "ws";
import { createBridgeClient, chunkText } from "@mulmobridge/client";

const TRANSPORT_ID = "signal";
const MAX_SIGNAL_TEXT = 4_000;
const FETCH_TIMEOUT_MS = 15_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 60_000;

const apiUrl = (process.env.SIGNAL_API_URL ?? "").replace(/\/$/, "");
const botNumber = process.env.SIGNAL_NUMBER;
if (!apiUrl || !botNumber) {
  console.error("SIGNAL_API_URL and SIGNAL_NUMBER are required.\n" + "See README for setup instructions.");
  process.exit(1);
}

const allowedNumbers = new Set(
  (process.env.SIGNAL_ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((num) => num.trim())
    .filter(Boolean),
);
const allowAll = allowedNumbers.size === 0;

const mulmo = createBridgeClient({ transportId: TRANSPORT_ID });
const wsUrl = `${apiUrl.replace(/^http/, "ws")}/v1/receive/${encodeURIComponent(botNumber)}`;

mulmo.onPush((pushEvent) => {
  sendSignal(pushEvent.chatId, pushEvent.message).catch((err) => console.error(`[signal] push send failed: ${err}`));
});

// ── Send ────────────────────────────────────────────────────────

async function sendSignal(recipientNumber: string, text: string): Promise<void> {
  const chunks = chunkText(text, MAX_SIGNAL_TEXT);
  for (const chunk of chunks) {
    let res: Response;
    try {
      res = await fetch(`${apiUrl}/v2/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chunk,
          number: botNumber,
          recipients: [recipientNumber],
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      console.error(`[signal] send network error: ${err}`);
      continue;
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[signal] send failed: ${res.status} ${detail.slice(0, 200)}`);
    }
  }
}

// ── Receive ─────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

function isObj(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

interface IncomingSignal {
  sourceNumber: string;
  text: string;
}

function parseEnvelope(raw: string): IncomingSignal | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed)) return null;
  const envelope = isObj(parsed.envelope) ? parsed.envelope : null;
  if (!envelope) return null;

  const source = typeof envelope.sourceNumber === "string" ? envelope.sourceNumber : typeof envelope.source === "string" ? envelope.source : "";
  const dataMessage = isObj(envelope.dataMessage) ? envelope.dataMessage : null;
  const text = dataMessage && typeof dataMessage.message === "string" ? dataMessage.message.trim() : "";
  if (!source || !text) return null;
  return { sourceNumber: source, text };
}

async function handleEnvelope(raw: string): Promise<void> {
  const msg = parseEnvelope(raw);
  if (!msg) return;

  if (!allowAll && !allowedNumbers.has(msg.sourceNumber)) {
    console.log(`[signal] denied from=${msg.sourceNumber}`);
    return;
  }

  console.log(`[signal] message from=${msg.sourceNumber} len=${msg.text.length}`);

  try {
    const ack = await mulmo.send(msg.sourceNumber, msg.text);
    if (ack.ok) {
      await sendSignal(msg.sourceNumber, ack.reply ?? "");
    } else {
      const status = ack.status ? ` (${ack.status})` : "";
      await sendSignal(msg.sourceNumber, `Error${status}: ${ack.error ?? "unknown"}`);
    }
  } catch (err) {
    console.error(`[signal] handleEnvelope error: ${err}`);
  }
}

// ── WebSocket loop ──────────────────────────────────────────────

// Module-scoped so the backoff survives across `connect()` calls. A
// previous version declared this inside `connect()`, which reset it
// to RECONNECT_BASE_MS on every reconnect — so a daemon flapping in
// a tight close loop would reconnect every ~1s forever instead of
// backing off. Reset to the base on successful `open`; double (capped
// at RECONNECT_MAX_MS) on each close.
let backoffMs = RECONNECT_BASE_MS;

function connect(): void {
  const socket = new WebSocket(wsUrl);

  socket.on("open", () => {
    console.log(`[signal] receive stream connected`);
    backoffMs = RECONNECT_BASE_MS;
  });

  socket.on("message", (buffer) => {
    handleEnvelope(buffer.toString()).catch((err) => console.error(`[signal] envelope handler error: ${err}`));
  });

  socket.on("error", (err) => {
    console.error(`[signal] stream error: ${err.message}`);
  });

  socket.on("close", (code, reason) => {
    const wait = backoffMs;
    backoffMs = Math.min(backoffMs * 2, RECONNECT_MAX_MS);
    console.warn(`[signal] stream closed code=${code} reason=${reason.toString().slice(0, 100)}; reconnecting in ${wait}ms`);
    setTimeout(connect, wait);
  });
}

// ── Main ────────────────────────────────────────────────────────

console.log("MulmoClaude Signal bridge");
console.log(`Daemon: ${apiUrl}`);
console.log(`Bot number: ${botNumber}`);
console.log(`Allowlist: ${allowAll ? "(all)" : [...allowedNumbers].join(", ")}`);

connect();
