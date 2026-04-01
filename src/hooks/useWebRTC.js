import { useState, useEffect, useRef } from 'react';
import { joinRoom } from '@trystero-p2p/torrent';

const APP_ID = 'minimal-video-caller-cf-pages';

export const useWebRTC = (roomId, localStream, username, isVideoEnabled, isAudioEnabled) => {
  const [peers, setPeers] = useState({}); // { [peerId]: { username } }
  const [remoteStreams, setRemoteStreams] = useState({}); // { [peerId]: MediaStream }
  const [remoteStatuses, setRemoteStatuses] = useState({}); // { [peerId]: { video, audio } }
  
  const roomRef = useRef(null);
  const localStreamRef = useRef(null);
  const usernameRef = useRef('');
  const statusRef = useRef({ video: true, audio: true });

  // Update refs to avoid stale closures in event listeners
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    statusRef.current = { video: isVideoEnabled, audio: isAudioEnabled };
  }, [isVideoEnabled, isAudioEnabled]);

  useEffect(() => {
    if (!roomId) return;

    const room = joinRoom({ appId: APP_ID }, roomId);
    roomRef.current = room;

    const [sendData, getData] = room.makeAction('peerData');

    room.onPeerJoin(peerId => {
      console.log(`Peer joined: ${peerId}`);
      
      // Send our latest state immediately using refs to avoid stale closures
      sendData({ 
        type: 'initialSync', 
        username: usernameRef.current,
        status: statusRef.current 
      }, peerId);

      // If we already have a stream when they join, share it directly with them
      if (localStreamRef.current) {
        room.addStream(localStreamRef.current, peerId);
      }
    });

    getData((data, peerId) => {
      if (data.type === 'initialSync' || data.type === 'updateStatus') {
        if (data.username) {
          setPeers(prev => ({ ...prev, [peerId]: { username: data.username } }));
        }
        if (data.status) {
          setRemoteStatuses(prev => ({ ...prev, [peerId]: data.status }));
        }
      }
    });

    room.onPeerLeave(peerId => {
      console.log(`Peer left: ${peerId}`);
      setPeers(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setRemoteStatuses(prev => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });

    room.onPeerStream((stream, peerId) => {
      console.log(`Received stream from: ${peerId}`);
      setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
      // Assume newly received stream is active until told otherwise
      setRemoteStatuses(prev => ({ 
        ...prev, 
        [peerId]: { video: true, audio: true } 
      }));
    });

    return () => {
      room.leave();
      setPeers({});
      setRemoteStreams({});
      setRemoteStatuses({});
    };
  }, [roomId]);

  // Broadcast local stream to EVERYONE newly
  // Runs only when localStream reference changes (i.e. starts the very first time)
  useEffect(() => {
    if (roomRef.current && localStream) {
      try {
        roomRef.current.addStream(localStream);
      } catch (e) {
        console.error("Failed to add stream globally:", e);
      }
    }
  }, [localStream]);

  // Broadcast status changes locally to all peers when toggles change
  useEffect(() => {
    if (roomRef.current && peers) {
       const [sendData] = roomRef.current.makeAction('peerData');
       try {
         // Sending without target peerId broadcasts to everyone
         sendData({ type: 'updateStatus', status: { video: isVideoEnabled, audio: isAudioEnabled } });
       } catch (e) {
         // ignore if room isn't ready
       }
    }
  }, [isVideoEnabled, isAudioEnabled, peers]); // dependencies needed so we broadcast to whoever is there

  return { peers, remoteStreams, remoteStatuses };
};
