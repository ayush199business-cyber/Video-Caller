import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  Users, 
  Monitor, 
  Hand, 
  LogOut, 
  MoreHorizontal,
  Pencil,
  Share2,
  PhoneOff
} from 'lucide-react';

export const Controls = ({ 
  isAudioEnabled, isVideoEnabled, isChatOpen, isScreenSharing, isHandRaised,
  toggleAudio, toggleVideo, toggleChat, toggleScreenShare, raiseHand, 
  sendReaction, isParticipantsOpen, toggleParticipants, theme, toggleTheme,
  toggleWhiteboard,
  isRecording, toggleRecording,
  stopMedia,
  isMobile
}) => {
  const navigate = useNavigate();

  const handleLeave = () => {
    stopMedia();
    navigate('/');
  };

  return (
    <div className={`fixed bottom-0 left-0 w-full p-4 sm:p-10 pointer-events-none z-[60] flex justify-center ${isMobile ? 'pb-8' : ''}`}>
      <div className={`flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-[#0d0f14]/80 backdrop-blur-2xl rounded-full border border-white/5 shadow-2xl pointer-events-auto transition-transform hover:scale-[1.01] active:translate-y-1 ${isMobile ? 'scale-90 sm:scale-100' : ''}`}>
        
        {/* Media Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-4 border-r border-white/10">
          <ControlBtn 
            active={!isAudioEnabled} 
            onClick={toggleAudio} 
            icon={isAudioEnabled ? <Mic size={isMobile ? 18 : 20} /> : <MicOff size={isMobile ? 18 : 20} />} 
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
            danger={!isAudioEnabled}
          />
          <ControlBtn 
            active={!isVideoEnabled} 
            onClick={toggleVideo} 
            icon={isVideoEnabled ? <Video size={isMobile ? 18 : 20} /> : <VideoOff size={isMobile ? 18 : 20} />} 
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
            danger={!isVideoEnabled}
          />
        </div>

        {/* Interaction Group */}
        <div className={`flex items-center gap-1.5 sm:gap-2 ${isMobile ? 'px-1' : 'px-2'} border-r border-white/10`}>
          <ControlBtn 
            active={isParticipantsOpen} 
            onClick={toggleParticipants} 
            icon={<Users size={isMobile ? 18 : 20} />} 
            title="Participants"
          />
          <ControlBtn 
            active={isChatOpen} 
            onClick={toggleChat} 
            icon={<MessageSquare size={isMobile ? 18 : 20} />} 
            title="Chat"
          />
          {!isMobile && (
            <>
              <ControlBtn 
                onClick={toggleWhiteboard} 
                icon={<Pencil size={20} />} 
                title="Open Standalone Whiteboard"
                indigo={true}
              />
              <ControlBtn 
                active={isRecording} 
                onClick={toggleRecording} 
                icon={<div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />} 
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
                danger={isRecording}
              />
              <ControlBtn 
                active={isScreenSharing} 
                onClick={toggleScreenShare} 
                icon={<Share2 size={20} />} 
                title="Share Screen"
                emerald={isScreenSharing}
              />
            </>
          )}
        </div>

        {/* More Options - Only for Desktop */}
        {!isMobile && (
          <div className="flex items-center gap-2 px-2">
            <ControlBtn 
              icon={<MoreHorizontal size={20} />} 
              title="More Options"
            />
          </div>
        )}

        {/* Leave Group */}
        <div className={`${isMobile ? 'pl-2' : 'pl-4'}`}>
          <button 
            onClick={handleLeave}
            className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 hover:border-rose-500 transition-all font-bold text-sm shadow-lg hover:shadow-rose-500/40 group`}
          >
            <PhoneOff size={isMobile ? 18 : 20} className="group-hover:-rotate-[135deg] transition-transform duration-500" />
            {!isMobile && <span className="hidden sm:inline">Leave Meeting</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

const ControlBtn = ({ active, onClick, icon, title, danger, indigo, emerald, badge }) => (
  <button 
    onClick={onClick}
    title={title}
    className={`
      p-3.5 rounded-2xl transition-all duration-300 relative group
      ${active ? 'shadow-lg scale-105' : 'hover:scale-105'}
      ${danger && active ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : ''}
      ${indigo && active ? 'bg-indigo-600 text-white shadow-indigo-500/40 border border-indigo-400' : ''}
      ${emerald && active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20' : ''}
      ${!active ? 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/20 hover:bg-white/10 hover:text-white' : ''}
      ${(!danger && !indigo && !emerald) && active ? 'bg-indigo-600 text-white shadow-indigo-500/40' : ''}
    `}
  >
    {icon}
    {badge && (
      <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-indigo-500 text-[8px] font-black text-white border border-[#0d0f14] shadow-lg">
        {badge}
      </div>
    )}
  </button>
);
