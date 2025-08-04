import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  data: string;
  timestamp: number;
}

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);

  const messageQueue = useRef<string[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}${url}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setReadyState(WebSocket.OPEN);
      // Send any queued messages
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        if (message) {
          ws.send(message);
        }
      }
    };

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED);
    };

    ws.onerror = () => {
      setReadyState(WebSocket.CLOSED);
    };

    ws.onmessage = (event) => {
      setLastMessage({
        data: event.data,
        timestamp: Date.now(),
      });
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (message: string) => {
    if (socket && readyState === WebSocket.OPEN) {
      socket.send(message);
    } else {
      // Queue message if not connected
      messageQueue.current.push(message);
    }
  };

  return {
    socket,
    lastMessage,
    readyState,
    sendMessage,
  };
}
