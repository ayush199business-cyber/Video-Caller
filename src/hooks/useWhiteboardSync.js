import { useState, useEffect, useRef } from 'react';

const WS_SIGNALS_URL = import.meta.env.VITE_WS_URL || 'wss://meetspace-signaling.ayush199business.workers.dev';

export const useWhiteboardSync = (roomId) => {
  const [remoteElements, setRemoteElements] = useState({});

  const socketRef  = useRef(null);
  const myPeerId   = useRef(crypto.randomUUID());
  // FIX: throttle broadcasts to max 1 per animation frame — prevents MB/s floods during drawing
  const rafRef     = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    const wsUrl = `${WS_SIGNALS_URL}/room/${roomId}?peerId=${myPeerId.current}&type=whiteboard`;
    const ws    = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'whiteboard_update':
            if (msg.senderPeerId !== myPeerId.current) {
              setRemoteElements(prev => ({ ...prev, [msg.senderPeerId]: msg.elements }));
            }
            break;
          case 'peer_leave':
            setRemoteElements(prev => {
              const n = { ...prev };
              delete n[msg.peerId];
              return n;
            });
            break;
        }
      } catch (e) {
        console.warn('[WB Sync]', e);
      }
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      socketRef.current?.close();
    };
  }, [roomId]);

  // FIX: RAF-throttled broadcast — only sends once per animation frame (≤60fps) instead of
  // every mousemove event. Eliminates the MB/s flood during active drawing strokes.
  const broadcastElements = (elements) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'whiteboard_update', elements }));
      }
    });
  };

  return { broadcastElements, remoteElements };
};
