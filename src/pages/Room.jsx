import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle2, Users } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from '../components/VideoPlayer';
import { Controls } from '../components/Controls';
import SidePanel from '../components/SidePanel';

import { copyToClipboard } from '../utils/helpers';

export const Room = () => {
  const { id: roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isHandRaised, setIsHandRaised] = useState(false);



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
    toggleScreenShare,
    isScreenSharing,
    error: mediaError
  } = useMedia();

  // Handle WebRTC Peers
  const { 
    peers, 
    remoteStreams, 
    remoteStatuses, 
    messages, 
    sendChatMessage,
    sendReaction,
    raiseHand
  } = useWebRTC(roomId, localStream, username, isVideoEnabled, isAudioEnabled);



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

  const toggleChat = () => {

    setIsChatOpen(!isChatOpen);
    if (isParticipantsOpen) setIsParticipantsOpen(false);
  };

  const toggleParticipants = () => {
    setIsParticipantsOpen(!isParticipantsOpen);
    if (isChatOpen) setIsChatOpen(false);
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleRaiseHand = (val) => {
    setIsHandRaised(val);
    raiseHand(val);
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
      isVideoEnabled: isVideoEnabled,
      isHandRaised: isHandRaised,
      lastReaction: null,
      reactionId: null
    },
    ...Object.entries(peers).map(([peerId, peerData]) => ({
      id: peerId,
      stream: remoteStreams[peerId],
      isLocal: false,
      username: peerData.username,
      isAudioMuted: !(remoteStatuses[peerId]?.audio ?? true),
      isVideoEnabled: remoteStatuses[peerId]?.video ?? true,
      isHandRaised: remoteStatuses[peerId]?.isHandRaised ?? false,
      lastReaction: remoteStatuses[peerId]?.lastReaction,
      reactionId: remoteStatuses[peerId]?.reactionId
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
    <div className={`h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'
    }`}>

      
      {/* Header */}
      <div className="absolute top-0 w-full z-40 p-6 flex justify-between items-center pointer-events-none">
        
        {/* Top Left: Logo */}
        <div className={`flex items-center gap-3 backdrop-blur-md px-4 py-2 rounded-2xl border transition shadow-lg pointer-events-auto ${
          theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white/80 border-gray-200'
        }`}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MS</span>
          </div>
          <span className="font-semibold hidden sm:inline-block">MeetSpace</span>
        </div>

        {/* Top Right: Meeting Code */}
        <div 
          onClick={handleCopyCode}
          className={`flex items-center gap-3 backdrop-blur-md px-5 py-2.5 rounded-2xl border pointer-events-auto cursor-pointer transition shadow-lg group ${
            theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800 border-gray-700' : 'bg-white/90 hover:bg-white border-gray-200'
          }`}
          title="Copy Meeting Code"
        >
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Meeting Code</span>
            <span className={`font-mono font-bold tracking-widest ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>{roomId}</span>
          </div>
          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-500 group-hover:scale-110 transition">
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </div>
        </div>
      </div>


      {/* Main Grid Area */}
      <div className="flex-grow w-full h-full flex overflow-hidden">
        
        <div className={`flex-grow h-full p-4 sm:p-8 flex items-center justify-center relative transition-all duration-300 ${(isChatOpen || isParticipantsOpen) ? 'pr-4 md:pr-0' : ''}`}>

          {mediaError && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-lg">
              {mediaError}
            </div>
          )}

          {displayParticipants.length === 1 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none opacity-50">
               <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-200/50'} inline-block p-4 rounded-full mb-4`}>
                  <Users size={32} />
               </div>
               <p className="text-lg font-medium">Waiting for others to join...</p>
               <p className={`text-sm mt-2 font-mono px-3 py-1 rounded inline-block border ${
                 theme === 'dark' ? 'bg-black/40 border-gray-700' : 'bg-white/40 border-gray-200'
               }`}>{roomId}</p>
            </div>
          )}


          <div className={`grid gap-4 w-full h-full max-h-[85vh] mt-16 sm:mt-10 pb-20 ${getGridClass(displayParticipants.length)} transition-all auto-rows-fr`}>
            {displayParticipants.map((participant) => (
              <div key={participant.id} className="w-full h-full relative">
                <VideoPlayer 
                  stream={participant.stream} 
                  isLocal={participant.isLocal}
                  username={participant.username}
                  isAudioMuted={participant.isAudioMuted}
                  isVideoEnabled={participant.isVideoEnabled}
                  lastReaction={participant.lastReaction}
                  reactionId={participant.reactionId}
                  isHandRaised={participant.isHandRaised}
                />

              </div>
            ))}
          </div>
        </div>

        {/* Right Side Panel */}
        {(isChatOpen || isParticipantsOpen) && (
          <div className="fixed inset-y-0 right-0 w-full md:relative md:w-80 h-full z-50 md:z-30">
            <SidePanel 
              messages={messages} 
              onSendMessage={sendChatMessage} 
              onClose={() => { setIsChatOpen(false); setIsParticipantsOpen(false); }}
              peers={peers}
              username={username}
              remoteStatuses={remoteStatuses}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              isHandRaised={isHandRaised}
            />
          </div>
        )}
      </div>



      {/* Controls */}
      <Controls 
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isChatOpen={isChatOpen}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        toggleChat={toggleChat}
        toggleScreenShare={toggleScreenShare} 
        raiseHand={handleRaiseHand}

        sendReaction={sendReaction}
        isParticipantsOpen={isParticipantsOpen}
        toggleParticipants={toggleParticipants}
        theme={theme}
        toggleTheme={toggleTheme}
        stopMedia={stopMedia}
      />


    </div>
  );
};
