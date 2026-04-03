import { useState, useEffect, useRef } from 'react';

const WS_SIGNALS_URL = import.meta.env.VITE_WS_URL || "wss://meetspace-signaling.ayush199business.workers.dev";

export const useWhiteboardSync = (roomId, username) => {
  const [peers, setPeers] = useState({});
  const [remoteElements, setRemoteElements] = useState({}); // { [peerId]: elements }
  
  const socketRef = useRef(null);
  const myPeerId = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!roomId) return;

    const wsUrl = `${WS_SIGNALS_URL}/room/${roomId}?peerId=${myPeerId.current}&type=whiteboard`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'room_state':
            // Whiteboard doesn't need to initiate WebRTC, just use WS for data if small
            // or we could use WebRTC DataChannels. For simplicity and low-bandwidth data, 
            // WS broadcasting via the signaling server is fine.
            break;
          
          case 'whiteboard_update':
            if (msg.senderPeerId !== myPeerId.current) {
              setRemoteElements(prev => ({
                ...prev,
                [msg.senderPeerId]: msg.elements
              }));
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
      } catch (err) {
        console.warn("WB Sync Error:", err);
      }
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, [roomId]);

  const broadcastElements = (elements) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'whiteboard_update',
        elements
      }));
    }
  };

  return { broadcastElements, remoteElements };
};
