import { useEffect, useRef, useState, useCallback } from 'react';

export interface Notification {
  type: 'notification';
  title: string;
  body: string;
  created_at: string;
}

interface WSState {
  onlineCount: number;
  notifications: Notification[];
  isConnected: boolean;
}

export function useWebSocket(): WSState {
  const [onlineCount, setOnlineCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnect = 10;

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'online_count') {
          setOnlineCount(data.count);
        } else if (data.type === 'notification') {
          setNotifications((prev) => [data, ...prev].slice(0, 20));
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (reconnectAttempts.current < maxReconnect) {
        reconnectAttempts.current++;
        setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  // Heartbeat every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return { onlineCount, notifications, isConnected };
}
