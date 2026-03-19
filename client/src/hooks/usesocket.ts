import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let globalSocket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Reuse existing connection
    if (!globalSocket) {
      globalSocket = io(window.location.origin, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    }
    socketRef.current = globalSocket;

    return () => {
      // Don't disconnect on unmount — keep alive
    };
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    globalSocket?.on(event, handler);
    return () => globalSocket?.off(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    globalSocket?.emit(event, data);
  }, []);

  return { on, emit, socket: socketRef.current };
}
