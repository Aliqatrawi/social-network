// Member4: Chat WebSocket client (private + group chat)
// Connects to backend WS endpoint and emits/receives chat events.

export type WSIncoming = any;

type Listener = (msg: WSIncoming) => void;

function toWsUrl(httpBase: string): string {
  // Connect directly to backend WebSocket endpoint
  const backendUrl = httpBase || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
  if (backendUrl.startsWith("https://")) return "wss://" + backendUrl.slice("https://".length) + "/ws";
  if (backendUrl.startsWith("http://")) return "ws://" + backendUrl.slice("http://".length) + "/ws";
  return "ws://localhost:8080/ws";
}

class ChatSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.connecting) return;

    this.connecting = true;

    try {
      this.ws = new WebSocket(this.url);
      console.log("[ChatSocket] Connecting to:", this.url);

      this.ws.onopen = () => {
        this.connecting = false;
        console.log("[ChatSocket] Connected");
      };

      this.ws.onmessage = (e) => {
        let data: any = null;
        try {
          data = JSON.parse(e.data);
        } catch {
          data = e.data;
        }
        console.log("[ChatSocket] Received:", data);
        this.listeners.forEach((fn) => fn(data));
      };

      this.ws.onclose = () => {
        console.log("[ChatSocket] Disconnected");
        this.connecting = false;
        this.ws = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 1200);
        }
      };

      this.ws.onerror = (err) => {
        console.log("[ChatSocket] Error:", err);
        // Let onclose handle reconnect
        try {
          this.ws?.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.connecting = false;
    }
  }

  isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  onMessage(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  // Sends chat message using a conservative event format.
  // Backend may accept either a flat payload or an envelope.
  sendChatMessage(conversationId: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

    const payload = {
      type: "chat_message",
      conversationId,
      content,
    };

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  sendTyping(conversationId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ type: "typing", conversationId }));
    } catch {
      // ignore
    }
  }
}

// Use the same base URL used by api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const chatSocket = new ChatSocket(toWsUrl(API_BASE_URL));
