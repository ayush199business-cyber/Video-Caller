import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle2, Users } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from '../components/VideoPlayer';
import { Controls } from '../components/Controls';
import { copyToClipboard } from '../utils/helpers';

export const Room = () => {
  const { id: roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [copied, setCopied] = useState(false);

  // If someone lands here directly without a username, redirect back to home
  useEffect(() => {
    if (!username) {
      navigate('/', { replace: true });
    }
  }, [username, navigate]);

  // Handle local media
  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
    error: mediaError
  } = useMedia();

  // Handle WebRTC Peers
  const { peers, remoteStreams, remoteStatuses } = useWebRTC(roomId, localStream, username, isVideoEnabled, isAudioEnabled);

  // Start media directly on load
  useEffect(() => {
    let active = true;
    if (username) {
      startMedia();
    }
    return () => {
      active = false;
      stopMedia();
    };
  }, [username, startMedia, stopMedia]);

  const handleCopyCode = async () => {
    const success = await copyToClipboard(roomId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!username) return null; // Wait for redirect

  // Combine local and remote streams for rendering
  const allParticipants = [
    {
      id: 'local',
      stream: localStream,
      isLocal: true,
      username: username + '',
      isAudioMuted: !isAudioEnabled,
      isVideoEnabled: isVideoEnabled
    },
    ...Object.entries(peers).map(([peerId, peerData]) => ({
      id: peerId,
      stream: remoteStreams[peerId],
      isLocal: false,
      username: peerData.username,
      isAudioMuted: !(remoteStatuses[peerId]?.audio ?? true),
      isVideoEnabled: remoteStatuses[peerId]?.video ?? true 
    }))
  ];

  // Restrict to max 5 users total (1 local + up to 4 remote)
  const displayParticipants = allParticipants.slice(0, 5);

  // Dynamic grid styling based on number of participants
  const getGridClass = (count) => {
    if (count === 1) return "grid-cols-1 md:w-3/4 lg:w-1/2 mx-auto";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    if (count === 4) return "grid-cols-1 md:grid-cols-2";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"; // 5 users
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] text-white flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none">
        
        {/* Top Left: Logo */}
        <div className="flex items-center gap-3 bg-gray-900/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-800 pointer-events-auto shadow-lg">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MS</span>
          </div>
          <span className="font-semibold hidden sm:inline-block">MeetSpace</span>
        </div>

        {/* Top Right: Meeting Code */}
        <div 
          onClick={handleCopyCode}
          className="flex items-center gap-3 bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-gray-700 pointer-events-auto cursor-pointer transition shadow-lg group"
          title="Copy Meeting Code"
        >
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Meeting Code</span>
            <span className="font-mono font-bold tracking-widest text-indigo-300">{roomId}</span>
          </div>
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/30 transition">
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </div>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-grow w-full h-full p-4 sm:p-8 flex items-center justify-center -mt-8 sm:-mt-0">
        
        {mediaError && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-lg">
            {mediaError}
          </div>
        )}

        {displayParticipants.length === 1 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none opacity-50">
             <div className="bg-gray-800/50 inline-block p-4 rounded-full mb-4">
                <Users size={32} />
             </div>
             <p className="text-lg font-medium">Waiting for others to join...</p>
             <p className="text-sm mt-2 font-mono bg-black/40 px-3 py-1 rounded inline-block border border-gray-700">{roomId}</p>
          </div>
        )}

        <div className={`grid gap-4 w-full max-w-7xl h-full max-h-[85vh] mt-16 sm:mt-10 pb-20 ${getGridClass(displayParticipants.length)} transition-all auto-rows-fr`}>
          {displayParticipants.map((participant) => (
            <div key={participant.id} className="w-full h-full relative">
              <VideoPlayer 
                stream={participant.stream} 
                isLocal={participant.isLocal}
                username={participant.username}
                isAudioMuted={participant.isAudioMuted}
                isVideoEnabled={participant.isVideoEnabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <Controls 
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        stopMedia={stopMedia}
      />
    </div>
  );
};
