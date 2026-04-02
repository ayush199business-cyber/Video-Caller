import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle2, Users, Hand, Monitor, X } from 'lucide-react';
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
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(true); // Default open for the new UI
  const [theme, setTheme] = useState('dark');
  const [isHandRaised, setIsHandRaised] = useState(false);

  // New Interface States
  const [activeParticipantId, setActiveParticipantId] = useState('local');
  const [panelSide, setPanelSide] = useState('right');
  const [panelStartIndex, setPanelStartIndex] = useState(0);

  // Handle local media
  const {
    localStream,
    screenStream,
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
    remoteScreenStreams,
    remoteStatuses, 
    messages, 
    sendChatMessage,
    sendReaction,
    raiseHand
  } = useWebRTC(roomId, localStream, screenStream, username, isVideoEnabled, isAudioEnabled);

  // Start media directly on load
  useEffect(() => {
    if (username) {
      startMedia();
    }
    return () => {
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

  if (!username) return null;

  // Build the list of all "viewable" items (Participants + Screens)
  const viewableItems = [
    {
      id: 'local',
      type: 'camera',
      stream: localStream,
      username: username,
      isLocal: true,
      isVideoEnabled,
      isAudioMuted: !isAudioEnabled,
      isHandRaised,
      status: { video: isVideoEnabled, audio: isAudioEnabled }
    }
  ];

  if (screenStream) {
    viewableItems.push({
      id: 'local-screen',
      type: 'screen',
      stream: screenStream,
      username: `${username}'s Screen`,
      isLocal: true,
      isVideoEnabled: true,
      isAudioMuted: true,
      status: { video: true, audio: false }
    });
  }

  Object.entries(peers).forEach(([peerId, peerData]) => {
    const status = remoteStatuses[peerId] || { video: true, audio: true };
    
    // Add Camera view
    viewableItems.push({
      id: peerId,
      type: 'camera',
      stream: remoteStreams[peerId],
      username: peerData.username,
      isLocal: false,
      isVideoEnabled: status.video,
      isAudioMuted: !status.audio,
      isHandRaised: status.isHandRaised,
      status: status
    });

    // Add Screen view if active
    if (remoteScreenStreams[peerId] || status.isScreenSharing) {
      viewableItems.push({
        id: `${peerId}-screen`,
        type: 'screen',
        stream: remoteScreenStreams[peerId],
        username: `${peerData.username}'s Screen`,
        isLocal: false,
        isVideoEnabled: true,
        isAudioMuted: true,
        status: { video: true, audio: false }
      });
    }
  });

  // Calculate the currently displayed large stream
  const activeItem = viewableItems.find(item => item.id === activeParticipantId) || viewableItems[0];

  // Pagination for side panel (5 at a time)
  const paginatedParticipants = viewableItems.slice(panelStartIndex, panelStartIndex + 5);
  const canGoPrev = panelStartIndex > 0;
  const canGoNext = panelStartIndex + 5 < viewableItems.length;

  return (
    <div className={`h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${
      theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      
      {/* Header */}
      <div className="absolute top-0 w-full z-40 p-4 sm:p-6 flex justify-between items-center pointer-events-none">
        <div className={`flex items-center gap-3 backdrop-blur-md px-4 py-2 rounded-2xl border transition shadow-lg pointer-events-auto ${
          theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white/80 border-gray-200'
        }`}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MS</span>
          </div>
          <span className="font-semibold hidden sm:inline-block">MeetSpace</span>
        </div>

        <div 
          onClick={handleCopyCode}
          className={`flex items-center gap-3 backdrop-blur-md px-4 py-2 rounded-2xl border pointer-events-auto cursor-pointer transition shadow-lg group ${
            theme === 'dark' ? 'bg-gray-900/80 hover:bg-gray-800 border-gray-700' : 'bg-white/90 hover:bg-white border-gray-200'
          }`}
        >
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Room Code</span>
            <span className={`font-mono font-bold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>{roomId}</span>
          </div>
          <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-500 group-hover:scale-110 transition">
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          </div>
        </div>
      </div>

      {/* Main Content: Flex Row with Main View and Side Panel */}
      <div className={`flex-grow w-full h-full flex flex-col md:flex-row overflow-hidden relative ${panelSide === 'left' ? 'md:flex-row-reverse' : ''}`}>
        
        {/* Main Video View Area */}
        <div className="flex-grow h-full p-4 sm:p-8 flex items-center justify-center relative animate-fade-in-up">
          {mediaError && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-lg animate-shake">
              {mediaError}
            </div>
          )}

          <div className="w-full h-full max-w-6xl max-h-[80vh] flex items-center justify-center bg-white/5 rounded-[40px] overflow-hidden shadow-[0_20px_80px_-20px_rgba(79,70,229,0.3)] border border-white/10 relative group">
             <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none transition-all group-hover:bg-indigo-500/20"></div>
             {activeItem ? (
               <VideoPlayer 
                  stream={activeItem.stream} 
                  isLocal={activeItem.isLocal}
                  username={activeItem.username}
                  isAudioMuted={activeItem.isAudioMuted}
                  isVideoEnabled={activeItem.isVideoEnabled}
                  isHandRaised={activeItem.isHandRaised}
                  type={activeItem.type}
               />
             ) : (
               <div className="flex flex-col items-center gap-4 text-gray-500">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/10 animate-pulse">
                    <Users size={64} className="opacity-20" />
                  </div>
                  <p className="font-bold tracking-widest uppercase text-xs">Connecting to stream...</p>
               </div>
             )}
          </div>
        </div>

        {/* Side Panel Area (Participants or Chat) */}
        {(isParticipantsOpen || isChatOpen) && (
          <div className={`w-full md:w-80 h-auto md:h-full glass-card border-t md:border-t-0 ${panelSide === 'right' ? 'md:border-l' : 'md:border-r'} border-white/10 flex flex-col z-30 transition-all duration-500 animate-fade-in-up [animation-delay:100ms]`}>
            
            {isParticipantsOpen ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <Users size={16} className="text-indigo-400" />
                    </div>
                    <span className="font-bold text-sm tracking-tight text-white uppercase">In Call ({viewableItems.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setPanelSide(panelSide === 'right' ? 'left' : 'right')}
                      className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white hover:scale-110"
                      title={`Move to ${panelSide === 'right' ? 'left' : 'right'}`}
                    >
                      {panelSide === 'right' ? <Copy className="-scale-x-100" size={16} /> : <Copy size={16} />}
                    </button>
                    <button 
                      onClick={() => setIsParticipantsOpen(false)}
                      className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white md:hidden"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {paginatedParticipants.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setActiveParticipantId(item.id)}
                      className={`group relative aspect-video w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-2 ${
                        activeParticipantId === item.id 
                          ? 'border-indigo-500 ring-8 ring-indigo-500/10 scale-[1.02] shadow-[0_0_30px_rgba(79,70,229,0.3)]' 
                          : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="absolute inset-0 z-0 opacity-60">
                         <VideoPlayer 
                            stream={item.stream} 
                            isLocal={item.isLocal} 
                            username={item.username} 
                            isVideoEnabled={item.isVideoEnabled}
                            isAudioMuted={item.isAudioMuted}
                            isSmall={true}
                            type={item.type}
                         />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/90 truncate max-w-[140px] uppercase tracking-wider">
                              {item.username} {item.isLocal && "(You)"}
                            </span>
                            {item.type === 'screen' && <Monitor size={10} className="text-indigo-400" />}
                         </div>
                      </div>
                      {item.isHandRaised && (
                        <div className="absolute top-2 right-2 bg-yellow-500 p-1.5 rounded-full animate-bounce shadow-lg">
                          <Hand size={10} className="text-white fill-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-white/5 flex gap-2 bg-white/[0.02]">
                  <button 
                    disabled={!canGoPrev}
                    onClick={() => setPanelStartIndex(Math.max(0, panelStartIndex - 5))}
                    className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest text-gray-300 border border-white/5"
                  >
                    Prev
                  </button>
                  <button 
                    disabled={!canGoNext}
                    onClick={() => setPanelStartIndex(Math.min(viewableItems.length - 1, panelStartIndex + 5))}
                    className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all text-[10px] font-black uppercase tracking-widest text-gray-300 border border-white/5"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <SidePanel 
                messages={messages} 
                onSendMessage={sendChatMessage} 
                onClose={() => setIsChatOpen(false)}
                peers={peers}
                username={username}
                remoteStatuses={remoteStatuses}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
                isHandRaised={isHandRaised}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls Overlay */}
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};
