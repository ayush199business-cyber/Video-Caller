import { useState, useEffect, useCallback, useRef } from 'react';
import { joinRoom } from '@trystero-p2p/torrent';

const APP_ID = 'minimal-video-caller-cf-pages'; // Unique ID for our app

export const useWebRTC = (roomId, localStream, username) => {
  const [peers, setPeers] = useState({}); // { [peerId]: { username } }
  const [remoteStreams, setRemoteStreams] = useState({}); // { [peerId]: MediaStream }
  const roomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    // Join the room using BitTorrent trackers for serverless signaling
    const room = joinRoom({ appId: APP_ID }, roomId);
    roomRef.current = room;

    // Setup action for sending/receiving usernames
    const [sendUsername, getUsername] = room.makeAction('username');

    // Handle peer join
    room.onPeerJoin(peerId => {
      console.log(`Peer joined: ${peerId}`);
      // Send our username to the new peer
      if (username) {
        sendUsername({ username }, peerId);
      }
      
      // If we already have a local stream hooked up, send it to the new peer
      if (localStream) {
        room.addStream(localStream, peerId);
      }
    });

    // Handle receiving usernames
    getUsername((data, peerId) => {
      setPeers(prev => ({
        ...prev,
        [peerId]: { username: data.username }
      }));
    });

    // Handle peer leaving
    room.onPeerLeave(peerId => {
      console.log(`Peer left: ${peerId}`);
      setPeers(prev => {
        const newPeers = { ...prev };
        delete newPeers[peerId];
        return newPeers;
      });
      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[peerId];
        return newStreams;
      });
    });

    // Handle incoming video streams
    room.onPeerStream((stream, peerId) => {
      console.log(`Received stream from: ${peerId}`);
      setRemoteStreams(prev => ({
        ...prev,
        [peerId]: stream
      }));
    });

    // Cleanup when component unmounts or room changes
    return () => {
      room.leave();
      setPeers({});
      setRemoteStreams({});
    };
  }, [roomId]); // Re-run only if roomId changes

  // Expose a method to broadcast the stream (if localStream loads after joining)
  useEffect(() => {
    if (roomRef.current && localStream) {
      // Broadcast stream to everyone we connected to so far
      // In Trystero, calling addStream without peerId sends it to all
      try {
        roomRef.current.addStream(localStream);
      } catch (e) {
        console.error("Failed to add stream:", e);
      }
    }
  }, [localStream]);

  return { peers, remoteStreams };
};
