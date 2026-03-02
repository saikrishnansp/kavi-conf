import { toast } from "sonner";
import { useWebSocket, type WebSocketStatus } from "@/hooks/useWebSocket";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext } from "react";
import { useAuth } from "./AuthContext";

interface WebSocketContextType {
  status: WebSocketStatus;
  lastMessage: unknown;
  send: (data: string | object) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({
  children,
  path = "/ws",
}: {
  children: ReactNode;
  path?: string;
}) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  
  const { status, lastMessage, send } = useWebSocket({
    path,
    token,
    connectOnMount: true,
    reconnect: true,
    onMessage: (data: any) => {
      console.debug("[WS] message", data);

      const { type, data: payload } = data;
      if (!type) return;

      const isMe = user && payload?.user_id === user.employee_id;
      const roomLabel = payload?.room_name ?? payload?.room_id ?? "this room";

      // Listen for booking events: refresh Rooms/Admin grids without page reload
      const BOOKING_EVENTS = ["booking_created", "booking_updated", "booking_cancelled"] as const;
      if (BOOKING_EVENTS.includes(type as (typeof BOOKING_EVENTS)[number])) {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      } else if (type.startsWith("room_") || type.startsWith("hold_")) {
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      }

      // Real-time notifications (don't toast for self-actions)
      if (type === "booking_created" && !isMe) {
        toast.success(`New booking confirmed for ${roomLabel}!`);
      } else if (type === "booking_updated" && !isMe) {
        toast.success("Booking updated.");
      } else if (type === "hold_acquired" && !isMe) {
        toast("Room status", {
          description: `Room ${roomLabel} is currently being viewed by another user.`,
        });
      }
    },
    onOpen: () => console.debug("[WS] connected"),
    onClose: (e) => console.debug("[WS] closed", e.code, e.reason),
    onError: () => console.debug("[WS] error"),
  });

  return (
    <WebSocketContext value={{ status, lastMessage, send }}>
      {children}
    </WebSocketContext>
  );
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext);
  if (ctx === undefined) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return ctx;
}