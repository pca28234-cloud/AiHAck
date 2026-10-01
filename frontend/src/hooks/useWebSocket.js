import { useEffect, useRef, useCallback } from 'react';

const WS_URL = `ws://${window.location.hostname}:8000/ws`;

/**
 * useWebSocket — manages a persistent WebSocket connection.
 * 
 * @param {string} role - "farmer" | "buyer" | "admin"
 * @param {function} onEvent - callback(event, data) called when a message arrives
 * @returns {{ sendMessage: function }}
 */
export function useWebSocket(role = 'all', onEvent) {
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = `${WS_URL}?role=${role}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS] Connected as ${role}`);
    };

    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        if (parsed.event && parsed.event !== 'pong' && onEvent) {
          onEvent(parsed.event, parsed.data || {});
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    ws.onerror = (err) => {
      console.warn('[WS] Error:', err);
    };

    ws.onclose = () => {
      console.warn('[WS] Disconnected. Reconnecting in 3s...');
      if (mountedRef.current) {
        reconnectTimeout.current = setTimeout(connect, 3000);
      }
    };
  }, [role, onEvent]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Ping every 25s to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 25000);

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeout.current);
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage };
}
