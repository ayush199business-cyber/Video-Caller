export class WebSocketRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // peerId -> WebSocket
  }

  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    
    const url = new URL(request.url);
    const peerId = url.searchParams.get('peerId') || crypto.randomUUID();

    this.sessions.set(peerId, server);
    server.accept();

    // Broadcast that a new peer joined
    this.broadcast({ type: 'peer_join', peerId });

    // Send the new peer a list of existing peers so they can initiate offers
    const existingPeers = Array.from(this.sessions.keys()).filter(id => id !== peerId);
    server.send(JSON.stringify({ type: 'room_state', peers: existingPeers }));

    server.addEventListener('message', async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.targetPeerId) {
          // Direct message (SDP offers, answers, ICE candidates)
          const targetWs = this.sessions.get(msg.targetPeerId);
          if (targetWs) {
            targetWs.send(JSON.stringify({ ...msg, senderPeerId: peerId }));
          }
        } else {
          // General Broadcast (e.g., status changes)
          this.broadcast({ ...msg, senderPeerId: peerId }, peerId);
        }
      } catch (err) {
        // ignoring malformed messages
      }
    });

    const cleanup = () => {
      this.sessions.delete(peerId);
      this.broadcast({ type: 'peer_leave', peerId });
    };

    server.addEventListener('close', cleanup);
    server.addEventListener('error', cleanup);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  broadcast(messageObj, excludePeerId = null) {
    const msg = JSON.stringify(messageObj);
    for (const [id, ws] of this.sessions.entries()) {
      if (id !== excludePeerId) {
        try {
          ws.send(msg);
        } catch (e) {
          this.sessions.delete(id);
        }
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    if (pathParts[0] === 'room' && pathParts[1]) {
      const roomId = pathParts[1];
      const id = env.ROOM_DO.idFromName(roomId);
      const doObj = env.ROOM_DO.get(id);
      return doObj.fetch(request);
    }
    
    if (request.method === 'OPTIONS') {
       return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
       });
    }

    return new Response('Signaling Server is Running', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};
