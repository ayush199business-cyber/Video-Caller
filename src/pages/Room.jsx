import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle2, Users, Hand, Monitor, X, Video, ShieldCheck, ArrowRight, Cloud, ChevronDown, Mic, MicOff, VideoOff, Search } from 'lucide-react';
import { useMedia } from '../hooks/useMedia';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoPlayer } from '../components/VideoPlayer';
import { Controls } from '../components/Controls';
import SidePanel from '../components/SidePanel';

import { Whiteboard } from '../components/Whiteboard';
import { copyToClipboard } from '../utils/helpers';

export const Room = () => {
  const { id: roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false); // Default hidden for mobile
  const [theme, setTheme] = useState('dark');
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [meetingTitle, setMeetingTitle] = useState('Math Class - Algebra Basics');

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
    const initMedia = async () => {
      if (username) {
        setIsMediaLoading(true);
        await startMedia();
        setIsMediaLoading(false);
      }
    };
    initMedia();
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

  useEffect(() => {
    if (!username) {
      navigate('/');
    }
  }, [username, navigate]);

  if (!username) return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-white text-xs font-black uppercase tracking-[0.3em] animate-pulse">Redirecting...</div>
    </div>
  );

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
      
      {/* Elite Top Header */}
      <div className="w-full z-40 p-4 sm:p-6 flex justify-between items-center glass border-b border-white/5 backdrop-blur-3xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
               <Video className="text-white" size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                {meetingTitle} <ShieldCheck size={14} className="text-emerald-500" />
              </span>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>Meeting ID: {roomId}</span>
                <span className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  Recording  12:45
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-900/60 p-1.5 rounded-xl border border-white/10">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[10px] flex items-center gap-2">
              <Users size={14} /> 6
            </div>
            <div className="relative group">
              <button 
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
              >
                View: {isWhiteboardOpen ? 'Whiteboard' : 'Video Call'} <ArrowRight size={14} className="rotate-90" />
              </button>
            </div>
          </div>
          <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
            <Monitor size={18} />
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {(isParticipantsOpen || isChatOpen) && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] animate-fade-in"
          onClick={() => { setIsParticipantsOpen(false); setIsChatOpen(false); }}
        />
      )}

      {/* Main Content: Flex Row with Main View and Side Panel */}
      <div className={`flex-grow w-full h-full flex flex-col md:flex-row overflow-hidden relative ${panelSide === 'left' ? 'md:flex-row-reverse' : ''}`}>
        
        {/* Main Video View Area */}
        <div className="flex-grow h-full p-2 sm:p-8 flex items-center justify-center relative animate-fade-in-up">
          {mediaError && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-3 rounded-2xl z-50 backdrop-blur-md shadow-lg animate-shake">
              {mediaError}
            </div>
          )}

          <div className="w-full h-full max-w-6xl max-h-[85vh] sm:max-h-[80vh] flex items-center justify-center bg-white/5 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-[0_20px_80px_-20px_rgba(79,70,229,0.3)] border border-white/10 relative group">
             <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none transition-all group-hover:bg-indigo-500/20"></div>
             
             {isMediaLoading ? (
               <div className="flex flex-col items-center gap-6 text-gray-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse scale-150"></div>
                    <div className="relative p-8 bg-white/5 rounded-full border border-white/10 animate-fade-in">
                      <Cloud size={64} className="text-indigo-400 opacity-80" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="font-black tracking-[0.2em] uppercase text-[10px] text-white/50">Establishing Secure P2P Tunnel...</p>
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-indigo-500 animate-[loading_1.5s_infinite]"></div>
                    </div>
                  </div>
               </div>
             ) : isWhiteboardOpen ? (
               <Whiteboard onClose={() => setIsWhiteboardOpen(false)} theme={theme} />
             ) : activeItem ? (
               <VideoPlayer 
                  stream={activeItem.stream} 
                  isLocal={activeItem.isLocal}
                  username={activeItem.username}
                  isAudioMuted={activeItem.isAudioMuted}
                  isVideoEnabled={activeItem.isVideoEnabled}
                  isHandRaised={activeItem.isHandRaised}
                  type={activeItem.type}
               />
             ) : null}
          </div>
        </div>

        {/* Side Panel Area: Persistent Elite Participants List */}
        <div 
          className={`
            fixed md:relative top-0 right-0 h-full w-[85%] md:w-80 max-w-sm md:max-w-none z-[50] md:z-30
            bg-[#0d0f14] border-l border-white/5 flex flex-col 
            transition-all duration-500 ease-in-out
            ${(isParticipantsOpen || isChatOpen) ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <span className="font-bold text-sm tracking-tight text-white/90">Participants ({viewableItems.length})</span>
              <ChevronDown size={18} className="text-gray-500" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {viewableItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setActiveParticipantId(item.id)}
                  className={`group relative p-3 rounded-2xl transition-all border border-transparent flex items-center justify-between cursor-pointer ${
                    activeParticipantId === item.id 
                      ? 'bg-indigo-500/10 border-indigo-500/20' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {item.isLocal ? (
                        <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden">
                           <VideoPlayer stream={item.stream} isLocal={true} isSmall={true} />
                        </div>
                      ) : (
                        <div className={`w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center font-bold text-lg bg-gray-800 text-white/20`}>
                           {item.username.charAt(0)}
                        </div>
                      )}
                      {(activeParticipantId === item.id || item.isLocal) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-[#0d0f14] shadow-lg shadow-indigo-500/40"></div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white leading-tight">
                        {item.username} {item.isLocal && "(You)"}
                      </span>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
                        {item.isLocal ? 'Host' : 'Participant'}
                      </span>
                      {item.type === 'screen' && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 w-fit">
                           <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                           <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Sharing Screen</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.isAudioMuted ? <MicOff size={14} className="text-rose-500" /> : <Mic size={14} className="text-emerald-500" />}
                    {item.isVideoEnabled ? <Video size={14} className="text-emerald-500" /> : <VideoOff size={14} className="text-rose-500" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-white/5">
              <button 
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-all"
              >
                View More ({Math.max(0, viewableItems.length - 10)}) <ChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
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
        isWhiteboardOpen={isWhiteboardOpen}
        toggleWhiteboard={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
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
