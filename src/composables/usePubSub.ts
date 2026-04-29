import { ref, type Ref } from "vue";
import { io, type Socket } from "socket.io-client";

interface PubSubMessage {
  channel: string;
  data: unknown;
}

type Callback = (data: unknown) => void;
type Unsubscribe = () => void;

// On reconnect we re-emit every live subscription so the rooms list survives the bounce.
let socket: Socket | null = null;

const listeners = new Map<string, Set<Callback>>();
const reconnectHandlers = new Set<() => void>();

// Live connection status — exposed so the UI can show a "reconnecting…"
// banner / icon while the socket is down. Module-level ref so every
// consumer reads the same source of truth without re-subscribing.
const connected = ref(false);

function resendSubscriptions(sock: Socket): void {
  for (const channel of listeners.keys()) {
    sock.emit("subscribe", channel);
  }
}

function connect(): Socket {
  if (socket) return socket;

  const sock = io({
    path: "/ws/pubsub",
    // Server refuses long-polling fallback, so fail fast here too if the WS upgrade doesn't go through.
    transports: ["websocket"],
  });

  sock.on("connect", () => {
    // True reconnect = `connected` was false AND we already have
    // listeners (= initial connect would also flip false→true, but
    // the listeners check distinguishes from first-load).
    const isReconnect = !connected.value && listeners.size > 0;
    connected.value = true;
    resendSubscriptions(sock);
    // After a true reconnect, give callers a chance to refetch state
    // that may have drifted while the link was down. The first connect
    // doesn't fire handlers because state is fresh anyway.
    if (isReconnect) {
      for (const handler of reconnectHandlers) {
        try {
          handler();
        } catch (err) {
          console.warn("[pubsub] reconnect handler threw:", err);
        }
      }
    }
  });

  sock.on("disconnect", () => {
    connected.value = false;
  });

  sock.on("data", (msg: PubSubMessage) => {
    const cbs = listeners.get(msg.channel);
    if (cbs) {
      for (const handler of cbs) handler(msg.data);
    }
  });

  socket = sock;
  return sock;
}

function maybeDisconnect(): void {
  if (listeners.size > 0) return;
  if (!socket) return;
  socket.disconnect();
  socket = null;
  connected.value = false;
}

export function usePubSub() {
  function subscribe(channel: string, callback: Callback): Unsubscribe {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(callback);

    const sock = connect();
    if (sock.connected) sock.emit("subscribe", channel);
    // If not yet connected, the "connect" handler replays every subscription — no extra bookkeeping needed.

    return () => {
      const cbs = listeners.get(channel);
      if (!cbs) return;
      cbs.delete(callback);
      if (cbs.size === 0) {
        listeners.delete(channel);
        if (socket?.connected) socket.emit("unsubscribe", channel);
      }
      maybeDisconnect();
    };
  }

  // Run `handler` after every successful reconnect (not the first
  // connect). Use this to re-pull state that the server may have
  // emitted while the link was down — pubsub events fired during
  // disconnect are lost.
  function onReconnect(handler: () => void): Unsubscribe {
    reconnectHandlers.add(handler);
    return () => {
      reconnectHandlers.delete(handler);
    };
  }

  return { subscribe, onReconnect, connected: connected as Readonly<Ref<boolean>> };
}
