import { useState, useEffect, useRef } from 'react';

const WS_SIGNALS_URL = import.meta.env.VITE_WS_URL || 'wss://meetspace-signaling.ayush199business.workers.dev';
const BASE_RECONNECT_MS = 1500;
const MAX_RECONNECT_MS  = 30000;

export const useWebRTC = (roomId, localStream, screenStream, username, isVideoEnabled, isAudioEnabled) => {
  const [peers,             setPeers]             = useState({});
  const [remoteStreams,     setRemoteStreams]     = useState({});
  const [remoteScreenStreams, setRemoteScreenStreams] = useState({});
  const [remoteStatuses,   setRemoteStatuses]   = useState({});
  const [messages,         setMessages]         = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // ── Refs (stable across renders, safe inside async closures) ──────────────
  const socketRef             = useRef(null);
  const rtcConnections        = useRef({});
  const localStreamRef        = useRef(null);
  const screenStreamRef       = useRef(null);
  const usernameRef           = useRef('');
  const statusRef             = useRef({ video: true, audio: true, isScreenSharing: false });

  // FIX 1: peersRef mirrors peers state — prevents stale closure in WS handlers
  const peersRef              = useRef({});

  // FIX 2: iceCandidateQueueRef moved OUT of the effect (was a local var → leaked on reconnect)
  const iceCandidateQueueRef  = useRef({});

  // NEW: per-peer Perfect Negotiation state { makingOffer, polite }
  const negotiationStateRef   = useRef({});

  // NEW: set of stream IDs declared as screen shares via signaling (replaces label heuristic)
  const remoteScreenIdsRef    = useRef({});

  // NEW: reconnection state
  const reconnectTimerRef     = useRef(null);
  const reconnectAttemptsRef  = useRef(0);
  const isUnmountedRef        = useRef(false);

  // NEW: stable peer ID survives reconnections (so existing peers don't see us as a new peer)
  const myPeerIdRef           = useRef(crypto.randomUUID());

  // ICE config — STUN + free TURN via Open Relay (added in previous session)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:openrelay.metered.ca:80' },
      { urls: 'turn:openrelay.metered.ca:80',               username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:80?transport=tcp',  username: 'openrelayproject', credential: 'openrelayproject' },
    ],
    iceCandidatePoolSize: 10,
  };

  // Keep refs in sync with latest prop values
  useEffect(() => { localStreamRef.current  = localStream;  }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);
  useEffect(() => { usernameRef.current     = username;     }, [username]);
  useEffect(() => {
    statusRef.current = { 
      video: isVideoEnabled, 
      audio: isAudioEnabled, 
      isScreenSharing: !!screenStream,
      screenStreamId: screenStream?.id || null
    };
  }, [isVideoEnabled, isAudioEnabled, screenStream]);

  // ── Main Effect: WebSocket + WebRTC lifecycle ─────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    isUnmountedRef.current = false;

    const processIceQueue = async (peerId, pc) => {
      const queue = iceCandidateQueueRef.current[peerId];
      if (queue?.length && pc.remoteDescription) {
        for (const c of queue) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('Queued ICE:', e));
        }
        iceCandidateQueueRef.current[peerId] = [];
      }
    };

    // ── connect() is recursive — calls itself on close for reconnection ──────
    const connect = () => {
      if (isUnmountedRef.current) return;

      // Close any stale peer connections from a previous session
      Object.values(rtcConnections.current).forEach(pc => { try { pc.close(); } catch (_) {} });
      rtcConnections.current       = {};
      iceCandidateQueueRef.current = {};
      negotiationStateRef.current  = {};
      remoteScreenIdsRef.current   = {};

      const wsUrl = `${WS_SIGNALS_URL}/room/${roomId}?peerId=${myPeerIdRef.current}`;
      const ws    = new WebSocket(wsUrl);
      socketRef.current = ws;
      setConnectionStatus('connecting');

      // ── Create a peer connection with Perfect Negotiation support ──────────
      const createPeerConnection = (targetPeerId, initiator) => {
        if (rtcConnections.current[targetPeerId]) return rtcConnections.current[targetPeerId];

        const pc = new RTCPeerConnection(rtcConfig);
        rtcConnections.current[targetPeerId] = pc;

        // Perfect Negotiation: initiator = impolite, answerer = polite
        const neg = { makingOffer: false, polite: !initiator };
        negotiationStateRef.current[targetPeerId] = neg;

        // Add local tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => pc.addTrack(t, screenStreamRef.current));
        }

        // ICE candidates
        pc.onicecandidate = (ev) => {
          if (ev.candidate && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'candidate', targetPeerId, candidate: ev.candidate }));
          }
        };

        // ICE restart on hard failure
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') {
            console.warn(`[RTC] Connection failed with ${targetPeerId} — restarting ICE`);
            pc.restartIce();
          }
        };

        // Incoming track — use signaling-declared stream IDs (reliable, replaces label heuristic)
        pc.ontrack = (ev) => {
          const stream     = ev.streams[0] || new MediaStream([ev.track]);
          const screenIds  = remoteScreenIdsRef.current[targetPeerId];
          const isScreen   = !!(screenIds && screenIds.has(stream.id));

          const setter = isScreen ? setRemoteScreenStreams : setRemoteStreams;
          setter(prev => {
            const existing = prev[targetPeerId] || new MediaStream();
            if (!existing.getTracks().find(t => t.id === ev.track.id)) existing.addTrack(ev.track);
            return { ...prev, [targetPeerId]: existing };
          });
        };

        // Perfect Negotiation — BOTH sides can now re-negotiate (fixes screen share for answerer)
        pc.onnegotiationneeded = async () => {
          try {
            neg.makingOffer = true;
            await pc.setLocalDescription();           // implicit offer
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'offer', targetPeerId,
                sdp: pc.localDescription,
                username: usernameRef.current,
                status: statusRef.current,
              }));
            }
          } catch (e) {
            console.error('[RTC] Negotiation error:', e);
          } finally {
            neg.makingOffer = false;
          }
        };

        return pc;
      };

      // ── WebSocket message handler ──────────────────────────────────────────
      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        reconnectAttemptsRef.current = 0;
        setConnectionStatus('connected');
      };

      ws.onmessage = async (ev) => {
        if (isUnmountedRef.current) return;
        try {
          const msg = JSON.parse(ev.data);

          // ── Helper to process incoming peer status synchronously ───────────────
          const updatePeerStatus = (senderPeerId, newStatus) => {
            if (!newStatus) return;
            
            if (newStatus.isScreenSharing && newStatus.screenStreamId) {
              if (!remoteScreenIdsRef.current[senderPeerId]) remoteScreenIdsRef.current[senderPeerId] = new Set();
              remoteScreenIdsRef.current[senderPeerId].add(newStatus.screenStreamId);
            } else {
              if (remoteScreenIdsRef.current[senderPeerId]) {
                remoteScreenIdsRef.current[senderPeerId].clear();
              }
              setRemoteScreenStreams(prev => { const n = { ...prev }; delete n[senderPeerId]; return n; });
            }
            setRemoteStatuses(prev => ({ ...prev, [senderPeerId]: newStatus }));
          };

          switch (msg.type) {

            case 'room_state':
              msg.peers.forEach(pid => createPeerConnection(pid, true));
              break;

            case 'offer': {
              const { senderPeerId, sdp, username: peerName, status: peerStatus } = msg;
              setPeers(prev => {
                const n = { ...prev, [senderPeerId]: { username: peerName || 'Anonymous' } };
                peersRef.current = n;
                return n;
              });
              updatePeerStatus(senderPeerId, peerStatus);

              let pc = rtcConnections.current[senderPeerId];
              if (!pc) pc = createPeerConnection(senderPeerId, false);

              const neg            = negotiationStateRef.current[senderPeerId] || { makingOffer: false, polite: true };
              const collision      = neg.makingOffer || pc.signalingState !== 'stable';
              if (!neg.polite && collision) break;           // impolite peer ignores offer collisions

              if (collision) {
                await Promise.all([
                  pc.setLocalDescription({ type: 'rollback' }),
                  pc.setRemoteDescription(new RTCSessionDescription(sdp)),
                ]);
              } else {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
              }
              await processIceQueue(senderPeerId, pc);
              await pc.setLocalDescription();               // implicit answer
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'answer', targetPeerId: senderPeerId,
                  sdp: pc.localDescription,
                  username: usernameRef.current,
                  status: statusRef.current,
                }));
              }
              break;
            }

            case 'answer': {
              const { senderPeerId, sdp, username: peerName, status: peerStatus } = msg;
              setPeers(prev => {
                const n = { ...prev, [senderPeerId]: { username: peerName || 'Anonymous' } };
                peersRef.current = n;
                return n;
              });
              updatePeerStatus(senderPeerId, peerStatus);
              const pc = rtcConnections.current[senderPeerId];
              if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await processIceQueue(senderPeerId, pc);
              }
              break;
            }

            case 'candidate': {
              const pc = rtcConnections.current[msg.senderPeerId];
              if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(e => console.warn('ICE:', e));
              } else {
                if (!iceCandidateQueueRef.current[msg.senderPeerId]) iceCandidateQueueRef.current[msg.senderPeerId] = [];
                iceCandidateQueueRef.current[msg.senderPeerId].push(msg.candidate);
              }
              break;
            }



            case 'peer_leave': {
              const pid = msg.peerId;
              rtcConnections.current[pid]?.close();
              delete rtcConnections.current[pid];
              delete iceCandidateQueueRef.current[pid];
              delete negotiationStateRef.current[pid];
              delete remoteScreenIdsRef.current[pid];
              setPeers(prev => { const n = { ...prev }; delete n[pid]; peersRef.current = n; return n; });
              setRemoteStreams(prev => { const n = { ...prev }; delete n[pid]; return n; });
              setRemoteScreenStreams(prev => { const n = { ...prev }; delete n[pid]; return n; });
              setRemoteStatuses(prev => { const n = { ...prev }; delete n[pid]; return n; });
              break;
            }

            case 'status_update':
              updatePeerStatus(msg.senderPeerId, msg.status);
              break;

            case 'chat': {
              // FIX: use peersRef.current — peers state is stale inside this closure
              const senderName = peersRef.current[msg.senderPeerId]?.username || msg.senderUsername || 'Anonymous';
              setMessages(prev => [...prev, {
                sender: senderName,
                text: msg.text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isLocal: false,
              }]);
              break;
            }

            case 'hand_raise':
              setRemoteStatuses(prev => ({
                ...prev,
                [msg.senderPeerId]: { ...(prev[msg.senderPeerId] || { video: true, audio: true }), isHandRaised: msg.isRaised },
              }));
              break;

            case 'reaction':
              setRemoteStatuses(prev => ({
                ...prev,
                [msg.senderPeerId]: { ...(prev[msg.senderPeerId] || { video: true, audio: true }), lastReaction: msg.emoji, reactionId: Date.now() },
              }));
              break;
          }
        } catch (e) {
          console.warn('[WS] Parse error:', e);
        }
      };

      // FIX: WebSocket reconnection with exponential backoff
      ws.onclose = (event) => {
        if (isUnmountedRef.current || event.code === 1000) return; // 1000 = intentional close
        setConnectionStatus('reconnecting');
        const delay = Math.min(BASE_RECONNECT_MS * 2 ** reconnectAttemptsRef.current, MAX_RECONNECT_MS);
        reconnectAttemptsRef.current += 1;
        console.log(`[WS] Disconnected. Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => { /* onclose handles reconnection */ };
    };

    connect();

    return () => {
      isUnmountedRef.current = true;
      clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close(1000, 'Component unmounted');
      Object.values(rtcConnections.current).forEach(pc => { try { pc.close(); } catch (_) {} });
      rtcConnections.current = {};
      setPeers({});
      setRemoteStreams({});
      setRemoteScreenStreams({});
      setRemoteStatuses({});
      setConnectionStatus('connecting');
    };
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Broadcast AV status changes (including screen share presence) ─────────
  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'status_update', status: statusRef.current }));
    }
  }, [isVideoEnabled, isAudioEnabled, screenStream]);

  // ── Keep live media tracks in sync across all peer connections ────────────
  useEffect(() => {
    Object.values(rtcConnections.current).forEach(async (pc) => {
      const senders = pc.getSenders();

      // Identify camera sender: video track from localStream
      const cameraSender = senders.find(s =>
        s.track?.kind === 'video' && localStream?.getVideoTracks().some(t => t.id === s.track.id)
      );
      const videoTrack = localStream?.getVideoTracks()[0];
      if (cameraSender && videoTrack && cameraSender.track !== videoTrack) {
        await cameraSender.replaceTrack(videoTrack).catch(e => console.error(e));
      } else if (!cameraSender && videoTrack) {
        pc.addTrack(videoTrack, localStream);
      }

      // Audio sync
      const audioSender = senders.find(s => s.track?.kind === 'audio');
      const audioTrack  = localStream?.getAudioTracks()[0];
      if (audioSender && audioTrack && audioSender.track !== audioTrack) {
        await audioSender.replaceTrack(audioTrack).catch(e => console.error(e));
      } else if (!audioSender && audioTrack) {
        pc.addTrack(audioTrack, localStream);
      }

      // Screen share sync — identify by matching against screenStream tracks
      const screenSender = senders.find(s =>
        s.track?.kind === 'video' && screenStream?.getVideoTracks().some(t => t.id === s.track.id)
      );
      const screenTrack = screenStream?.getVideoTracks()[0];
      if (screenStream) {
        if (!screenSender && screenTrack) pc.addTrack(screenTrack, screenStream);
      } else {
        // Remove tracks NOT belonging to localStream (i.e., old screen tracks)
        senders.forEach(s => {
          if (s.track?.kind === 'video' && !localStream?.getVideoTracks().some(t => t.id === s.track?.id)) {
            pc.removeTrack(s);
          }
        });
      }
    });
  }, [localStream, screenStream]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const sendChatMessage = (text) => {
    if (socketRef.current?.readyState === WebSocket.OPEN && text.trim()) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        text,
        senderUsername: usernameRef.current,  // sent as fallback for fast-join edge case
      }));
      setMessages(prev => [...prev, {
        sender: 'You', text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLocal: true,
      }]);
    }
  };

  const sendReaction = (emoji) => {
    socketRef.current?.readyState === WebSocket.OPEN &&
      socketRef.current.send(JSON.stringify({ type: 'reaction', emoji }));
  };

  const raiseHand = (isRaised) => {
    socketRef.current?.readyState === WebSocket.OPEN &&
      socketRef.current.send(JSON.stringify({ type: 'hand_raise', isRaised }));
  };

  return { peers, remoteStreams, remoteScreenStreams, remoteStatuses, messages, connectionStatus, sendChatMessage, sendReaction, raiseHand };
};
