import { useCallback, useEffect, useRef, useState } from "react";

const getWsUrl = () => {
  const fromEnv = import.meta.env.VITE_WS_URL;
  if (fromEnv) {
    const base = fromEnv;
    return base.endsWith("/") ? base.slice(0, -1) : base;
  }
  
  // Try VITE_BACKEND_URL or VITE_API_URL, default to localhost
  const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || "http://localhost:8000";
  
  // Strip /api/v1 if present because WS is usually at the root
  const rootUrl = backendUrl.split("/api/v1")[0];
  
  return rootUrl.replace(/^http/, "ws");
};

export type WebSocketStatus = "connecting" | "open" | "closing" | "closed" | "error";

export interface UseWebSocketOptions {
  /** Path to append to WS base URL (e.g. "/ws") */
  path?: string;
  /** Auth token for query param */
  token?: string | null;
  /** Connect on mount */
  connectOnMount?: boolean;
  /** Reconnect on close (with backoff) */
  reconnect?: boolean;
  /** Max reconnect attempts (when reconnect is true) */
  maxReconnectAttempts?: number;
  /** Callback when a message is received */
  onMessage?: (data: unknown) => void;
  /** Callback when connection opens */
  onOpen?: () => void;
  /** Callback when connection closes */
  onClose?: (event: CloseEvent) => void;
  /** Callback on error */
  onError?: (event: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    path = "",
    token: tokenOption,
    connectOnMount = true,
    reconnect = true,
    maxReconnectAttempts = 5,
    onMessage,
    onOpen,
    onClose,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>("closed");
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const url = `${getWsUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = tokenOption ?? localStorage.getItem("token");
    if (!token) {
      console.debug("[WS] Connection skipped: No token available");
      return;
    }

    setStatus("connecting");
    const authenticatedUrl = `${url}?token=${token}`;
    const ws = new WebSocket(authenticatedUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
      reconnectCountRef.current = 0;
      optionsRef.current.onOpen?.();

      // Start heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      // Store interval to clear it on close
      (ws as any)._heartbeatInterval = heartbeatInterval;
    };

    ws.onmessage = (event) => {
      let data: unknown;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        data = event.data;
      }

      // Handle pong if server sends it
      if (data && typeof data === "object" && (data as any).type === "pong") {
        return;
      }

      setLastMessage(data);
      optionsRef.current.onMessage?.(data);
    };

    ws.onclose = (event) => {
      const wsObj = wsRef.current as any;
      if (wsObj?._heartbeatInterval) {
        clearInterval(wsObj._heartbeatInterval);
      }
      
      wsRef.current = null;
      setStatus("closed");
      optionsRef.current.onClose?.(event);

      if (
        optionsRef.current.reconnect !== false &&
        reconnectCountRef.current < (optionsRef.current.maxReconnectAttempts ?? maxReconnectAttempts)
      ) {
        reconnectCountRef.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectCountRef.current, 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      optionsRef.current.onError?.({} as Event);
    };

    return ws;
  }, [url, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectCountRef.current = maxReconnectAttempts + 1;
    if (wsRef.current) {
      setStatus("closing");
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("closed");
  }, []);

  const send = useCallback((data: string | object) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(typeof data === "string" ? data : JSON.stringify(data));
  }, []);

  useEffect(() => {
    if (connectOnMount) connect();
    return () => disconnect();
  }, [connectOnMount, connect, disconnect, tokenOption]);

  return { status, lastMessage, connect, disconnect, send };
}
