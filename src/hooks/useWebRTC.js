import { useState, useEffect, useRef } from 'react';

// You will update this URL after `npx wrangler deploy` in the signaling-server folder
const WS_SIGNALS_URL = import.meta.env.VITE_WS_URL || "wss://meetspace-signaling.ayush199business.workers.dev"; 

export const useWebRTC = (roomId, localStream, username, isVideoEnabled, isAudioEnabled) => {
  const [peers, setPeers] = useState({}); // { [peerId]: { username } }
  const [remoteStreams, setRemoteStreams] = useState({}); // { [peerId]: MediaStream }
  const [remoteStatuses, setRemoteStatuses] = useState({}); // { [peerId]: { video, audio } }
  const [messages, setMessages] = useState([]); // Array of { sender, text, timestamp, isLocal }


  const socketRef = useRef(null);
  const rtcConnections = useRef({}); // RTCPeerConnection objects
  
  const localStreamRef = useRef(null);
  const usernameRef = useRef('');
  const statusRef = useRef({ video: true, audio: true });
  
  // Public Google STUN servers to bypass carrier NATs completely
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { statusRef.current = { video: isVideoEnabled, audio: isAudioEnabled }; }, [isVideoEnabled, isAudioEnabled]);

  useEffect(() => {
    if (!roomId) return;
    
    // Connect to Cloudflare Worker WebSocket Signaling Backend
    const myPeerId = crypto.randomUUID();
    const wsUrl = `${WS_SIGNALS_URL}/room/${roomId}?peerId=${myPeerId}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    const createPeerConnection = (targetPeerId, initiator) => {
      if (rtcConnections.current[targetPeerId]) return rtcConnections.current[targetPeerId];

      const pc = new RTCPeerConnection(rtcConfig);
      rtcConnections.current[targetPeerId] = pc;

      // Add our tracks natively
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle ICE Candidate generations
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
           ws.send(JSON.stringify({ type: 'candidate', targetPeerId, candidate: event.candidate }));
        }
      };

      // Handle raw stream payload delivery
      pc.ontrack = (event) => {
         const remoteStream = event.streams[0];
         if (remoteStream) {
            setRemoteStreams(prev => ({ ...prev, [targetPeerId]: remoteStream }));
            // Set default explicit unmuted states
            setRemoteStatuses(prev => ({ ...prev, [targetPeerId]: { video: true, audio: true } }));
         }
      };

      // SDP Negotiation
      pc.onnegotiationneeded = async () => {
         if (initiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (ws.readyState === WebSocket.OPEN) {
               ws.send(JSON.stringify({ 
                 type: 'offer', 
                 targetPeerId, 
                 sdp: pc.localDescription,
                 username: usernameRef.current,
                 status: statusRef.current 
               }));
            }
         }
      };

      return pc;
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'room_state':
             // Creates outgoing physical socket rails for everyone already inside
             msg.peers.forEach(existingPeerId => {
                createPeerConnection(existingPeerId, true);
             });
             break;
             
          case 'offer':
             {
                const { senderPeerId, sdp, username: peerUsername, status: peerStatus } = msg;
                setPeers(prev => ({ ...prev, [senderPeerId]: { username: peerUsername || 'Anonymous' } }));
                if (peerStatus) setRemoteStatuses(prev => ({ ...prev, [senderPeerId]: peerStatus }));

                const pc = createPeerConnection(senderPeerId, false);
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ 
                      type: 'answer', 
                      targetPeerId: senderPeerId, 
                      sdp: pc.localDescription,
                      username: usernameRef.current,
                      status: statusRef.current
                    }));
                }
             }
             break;
             
          case 'answer':
             {
                const { senderPeerId, sdp, username: peerUsername, status: peerStatus } = msg;
                setPeers(prev => ({ ...prev, [senderPeerId]: { username: peerUsername || 'Anonymous' } }));
                if (peerStatus) setRemoteStatuses(prev => ({ ...prev, [senderPeerId]: peerStatus }));
                
                const pc = rtcConnections.current[senderPeerId];
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
             }
             break;
             
          case 'candidate':
             {
                const pc = rtcConnections.current[msg.senderPeerId];
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
             }
             break;
             
          case 'peer_leave':
             {
                const leftPeerId = msg.peerId;
                if (rtcConnections.current[leftPeerId]) {
                   rtcConnections.current[leftPeerId].close();
                   delete rtcConnections.current[leftPeerId];
                }
                setPeers(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
                setRemoteStreams(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
                setRemoteStatuses(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
             }
             break;
             
          case 'status_update':
             {
                setRemoteStatuses(prev => ({ ...prev, [msg.senderPeerId]: msg.status }));
             }
             break;
             
          case 'chat':
             {
                const senderName = peers[msg.senderPeerId]?.username || 'Anonymous';
                setMessages(prev => [...prev, { 
                  sender: senderName, 
                  text: msg.text, 
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isLocal: false 
                }]);
             }
             break;

          case 'hand_raise':
             {
                setRemoteStatuses(prev => ({
                   ...prev,
                   [msg.senderPeerId]: { ...(prev[msg.senderPeerId] || { video: true, audio: true }), isHandRaised: msg.isRaised }
                }));
             }
             break;

          case 'reaction':
             {
                setRemoteStatuses(prev => ({
                   ...prev,
                   [msg.senderPeerId]: { ...(prev[msg.senderPeerId] || { video: true, audio: true }), lastReaction: msg.emoji, reactionId: Date.now() }
                }));
             }
             break;


        }
      } catch (err) {
         console.warn("WS Message parse error:", err);
      }
    };

    return () => {
      if (socketRef.current) socketRef.current.close();
      Object.values(rtcConnections.current).forEach(pc => pc.close());
      rtcConnections.current = {};
      setPeers({});
      setRemoteStreams({});
      setRemoteStatuses({});
    };
  }, [roomId]);


  // Synchronize media unmounts over Central Auth Channel
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
       socketRef.current.send(JSON.stringify({ 
         type: 'status_update', 
         status: { video: isVideoEnabled, audio: isAudioEnabled } 
       }));
    }
  }, [isVideoEnabled, isAudioEnabled]);

   // Aggressively bind live media streams to connections and handle track replacement (Screen Sharing)
   useEffect(() => {
     if (localStream) {
       const newVideoTrack = localStream.getVideoTracks()[0];
       const newAudioTrack = localStream.getAudioTracks()[0];

       Object.values(rtcConnections.current).forEach(async (pc) => {
         const senders = pc.getSenders();
         
         // 1. Handle Video Track Replacement
         const videoSender = senders.find(s => s.track?.kind === 'video');
         if (videoSender && newVideoTrack && videoSender.track !== newVideoTrack) {
            try {
               await videoSender.replaceTrack(newVideoTrack);
            } catch (e) {
               console.error("Failed to replace video track:", e);
            }
         } else if (!videoSender && newVideoTrack) {
            pc.addTrack(newVideoTrack, localStream);
         }

         // 2. Handle Audio Track (Ensure it's added if missing)
         const audioSender = senders.find(s => s.track?.kind === 'audio');
         if (!audioSender && newAudioTrack) {
            pc.addTrack(newAudioTrack, localStream);
         }
       });
     }
   }, [localStream]);


  const sendChatMessage = (text) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        text
      }));
      setMessages(prev => [...prev, {
        sender: 'You',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLocal: true
      }]);
    }
  };

  const sendReaction = (emoji) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
    }
  };

  const raiseHand = (isRaised) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'hand_raise', isRaised }));
    }
  };

  return { peers, remoteStreams, remoteStatuses, messages, sendChatMessage, sendReaction, raiseHand };
};


