import { WebSocketServer, WebSocket, type RawData } from "ws";
import http from "http";

export type SubscribeHandler = (channel: string, ws: WebSocket) => void;

export interface IPubSub {
  /** Publish data to all clients subscribed to this channel. */
  publish(channel: string, data: unknown): void;
  /** Send data to a single client on a channel (for snapshots). */
  sendToClient(ws: WebSocket, channel: string, data: unknown): void;
  /**
   * Register a handler that fires when any client subscribes to a
   * channel matching `prefix`. The handler receives the full channel
   * name and the WebSocket so it can push an initial snapshot.
   */
  onSubscribe(prefix: string, handler: SubscribeHandler): void;
}

/** Attach WebSocket server to an existing HTTP server. Returns the pub/sub API. */
export function createPubSub(server: http.Server): IPubSub {
  const wss = new WebSocketServer({ server, path: "/ws/pubsub" });
  const subscriptions = new Map<WebSocket, Set<string>>();
  const subscribeHandlers: { prefix: string; handler: SubscribeHandler }[] = [];

  wss.on("connection", (ws: WebSocket) => {
    subscriptions.set(ws, new Set());

    ws.on("message", (raw: RawData) => {
      try {
        const msg: { action?: string; channel?: string } = JSON.parse(
          raw.toString(),
        );
        if (!msg.channel || typeof msg.channel !== "string") return;
        const channels = subscriptions.get(ws)!;
        if (msg.action === "subscribe") {
          channels.add(msg.channel);
          for (const { prefix, handler } of subscribeHandlers) {
            if (msg.channel.startsWith(prefix)) {
              handler(msg.channel, ws);
            }
          }
        }
        if (msg.action === "unsubscribe") channels.delete(msg.channel);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      subscriptions.delete(ws);
    });
  });

  return {
    publish(channel: string, data: unknown) {
      const payload = JSON.stringify({ channel, data });
      for (const [ws, channels] of subscriptions) {
        if (channels.has(channel) && ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    },

    sendToClient(ws: WebSocket, channel: string, data: unknown) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ channel, data }));
      }
    },

    onSubscribe(prefix: string, handler: SubscribeHandler) {
      subscribeHandlers.push({ prefix, handler });
    },
  };
}
