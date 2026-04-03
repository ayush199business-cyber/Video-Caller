import { useState, useEffect, useRef } from 'react';

// You will update this URL after `npx wrangler deploy` in the signaling-server folder
const WS_SIGNALS_URL = import.meta.env.VITE_WS_URL || "wss://meetspace-signaling.ayush199business.workers.dev"; 

export const useWebRTC = (roomId, localStream, screenStream, username, isVideoEnabled, isAudioEnabled) => {
  const [peers, setPeers] = useState({}); // { [peerId]: { username } }
  const [remoteStreams, setRemoteStreams] = useState({}); // { [peerId]: MediaStream }
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({}); // { [peerId]: MediaStream }
  const [remoteStatuses, setRemoteStatuses] = useState({}); // { [peerId]: { video, audio, isScreenSharing } }
  const [messages, setMessages] = useState([]); // Array of { sender, text, timestamp, isLocal }


  const socketRef = useRef(null);
  const rtcConnections = useRef({}); // RTCPeerConnection objects
  
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const usernameRef = useRef('');
  const statusRef = useRef({ video: true, audio: true, isScreenSharing: false });
  
  // Public STUN servers to bypass carrier NATs and reduce connection latency
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  };

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { 
    statusRef.current = { 
      video: isVideoEnabled, 
      audio: isAudioEnabled, 
      isScreenSharing: !!screenStream 
    }; 
  }, [isVideoEnabled, isAudioEnabled, screenStream]);

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
      
      // Add screen share tracks if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, screenStreamRef.current);
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
         const targetStream = event.streams[0] || new MediaStream();
         
         // Distinguish between camera and screen share
         const isScreen = event.track.label.toLowerCase().includes('screen') || 
                          event.track.label.toLowerCase().includes('window') ||
                          (event.streams[0]?.id && event.streams[0].id.includes('screen')) ||
                          event.track.kind === 'video' && pc.getReceivers().filter(r => r.track?.kind === 'video').length > 1; // Fallback heuristic
         
         if (isScreen) {
           setRemoteScreenStreams(prev => {
             const existing = prev[targetPeerId] || new MediaStream();
             if (!existing.getTracks().find(t => t.id === event.track.id)) {
               existing.addTrack(event.track);
             }
             return { ...prev, [targetPeerId]: existing };
           });
         } else {
           setRemoteStreams(prev => {
             const existing = prev[targetPeerId] || new MediaStream();
             if (!existing.getTracks().find(t => t.id === event.track.id)) {
               existing.addTrack(event.track);
             }
             return { ...prev, [targetPeerId]: existing };
           });
         }
         
         event.track.onunmute = () => {
           console.log(`Track unmuted for ${targetPeerId}:`, event.track.kind);
           setRemoteStatuses(prev => ({ 
             ...prev, 
             [targetPeerId]: { 
               ...(prev[targetPeerId] || {}), 
               [event.track.kind]: true 
             } 
           }));
         };
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

    const iceCandidateQueue = {};

    const processIceQueue = async (peerId, pc) => {
      if (iceCandidateQueue[peerId] && pc.remoteDescription) {
        for (const candidate of iceCandidateQueue[peerId]) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => console.warn("Queued ICE Error:", err));
        }
        iceCandidateQueue[peerId] = [];
      }
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'room_state':
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
                processIceQueue(senderPeerId, pc);

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
                if (pc) {
                   await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                   processIceQueue(senderPeerId, pc);
                }
             }
             break;
             
          case 'candidate':
             {
                const pc = rtcConnections.current[msg.senderPeerId];
                if (pc && pc.remoteDescription) {
                   await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(err => console.warn("ICE Error:", err));
                } else {
                   if (!iceCandidateQueue[msg.senderPeerId]) iceCandidateQueue[msg.senderPeerId] = [];
                   iceCandidateQueue[msg.senderPeerId].push(msg.candidate);
                }
             }
             break;
             
          case 'peer_leave':
             {
                const leftPeerId = msg.peerId;
                if (rtcConnections.current[leftPeerId]) {
                   rtcConnections.current[leftPeerId].close();
                   delete rtcConnections.current[leftPeerId];
                }
                delete iceCandidateQueue[leftPeerId];
                setPeers(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
                setRemoteStreams(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
                setRemoteScreenStreams(prev => { const n={...prev}; delete n[leftPeerId]; return n; });
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
      setRemoteScreenStreams({});
      setRemoteStatuses({});
    };
  }, [roomId]);


  // Synchronize media over Central Auth Channel
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
       socketRef.current.send(JSON.stringify({ 
         type: 'status_update', 
         status: statusRef.current 
       }));
    }
  }, [isVideoEnabled, isAudioEnabled, screenStream]);

   // Aggressively bind live media streams to connections and handle track replacement
   useEffect(() => {
     Object.values(rtcConnections.current).forEach(async (pc) => {
       const senders = pc.getSenders();
       
       // Sync Camera Video
       if (localStream) {
         const videoTrack = localStream.getVideoTracks()[0];
         const videoSender = senders.find(s => s.track?.kind === 'video' && !s.track.label.toLowerCase().includes('screen'));
         if (videoSender && videoTrack && videoSender.track !== videoTrack) {
           await videoSender.replaceTrack(videoTrack).catch(e => console.error(e));
         } else if (!videoSender && videoTrack) {
           pc.addTrack(videoTrack, localStream);
         }
       }

       // Sync Audio
       if (localStream) {
         const audioTrack = localStream.getAudioTracks()[0];
         const audioSender = senders.find(s => s.track?.kind === 'audio');
         if (audioSender && audioTrack && audioSender.track !== audioTrack) {
           await audioSender.replaceTrack(audioTrack).catch(e => console.error(e));
         } else if (!audioSender && audioTrack) {
           pc.addTrack(audioTrack, localStream);
         }
       }

       // Sync Screen Share
       if (screenStream) {
         const screenTrack = screenStream.getVideoTracks()[0];
         const screenSender = senders.find(s => s.track?.kind === 'video' && s.track.label.toLowerCase().includes('screen'));
         if (!screenSender && screenTrack) {
           pc.addTrack(screenTrack, screenStream);
         }
       } else {
         // REMOVE screen tracks if not sharing
         senders.forEach(sender => {
           if (sender.track?.kind === 'video' && sender.track.label.toLowerCase().includes('screen')) {
             pc.removeTrack(sender);
           }
         });
       }
     });
   }, [localStream, screenStream]);


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

  return { peers, remoteStreams, remoteScreenStreams, remoteStatuses, messages, sendChatMessage, sendReaction, raiseHand };
};


