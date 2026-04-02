import React, { useState } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Monitor, MonitorOff, 
  Hand, Smile, Users, Sun, Moon 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Controls = ({ 
  isAudioEnabled, isVideoEnabled, isChatOpen, isScreenSharing, isHandRaised,
  toggleAudio, toggleVideo, toggleChat, toggleScreenShare, raiseHand, 
  sendReaction, isParticipantsOpen, toggleParticipants, theme, toggleTheme,
  isWhiteboardOpen, toggleWhiteboard,
  stopMedia 
}) => {
  const navigate = useNavigate();
  const [showReactions, setShowReactions] = useState(false);

  const handleLeave = () => {
    stopMedia();
    navigate('/');
  };

  const reactions = ['❤️', '👏', '🔥', '😂', '😮', '👍'];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
      
      {/* Reaction Picker Popover */}
      {showReactions && (
        <div className="flex gap-2 bg-gray-900/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-200">
          {reactions.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                sendReaction(emoji);
                setShowReactions(false);
              }}
              className="text-2xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 sm:gap-4 bg-gray-900/80 backdrop-blur-2xl px-4 sm:px-8 py-3 sm:py-4 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/5">
        
        {/* Media Group */}
        <div className="flex gap-2 border-r border-white/10 pr-2 sm:pr-4">
          <button
            onClick={toggleAudio}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isAudioEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isVideoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500 text-white'
            }`}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
        </div>

        {/* Interaction Group */}
        <div className="flex gap-2">
          <button
            onClick={toggleScreenShare}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isScreenSharing ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className={`p-3 sm:p-4 rounded-full transition-all duration-300 bg-gray-800 hover:bg-gray-700 text-white`}
              title="Reactions"
            >
              <Smile size={20} />
            </button>
          </div>

          <button
            onClick={() => raiseHand(!isHandRaised)}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isHandRaised ? 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand size={20} />
          </button>

          {/* Desktop-only Whiteboard Toggle */}
          <div className="hidden md:flex">
            <button
              onClick={toggleWhiteboard}
              className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
                isWhiteboardOpen ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title={isWhiteboardOpen ? 'Close Whiteboard' : 'Open Whiteboard'}
            >
              <Pencil size={20} />
            </button>
          </div>
        </div>

        {/* Panel Group */}
        <div className="flex gap-2 border-l border-white/10 pl-2 sm:pl-4">
          <button
            onClick={toggleParticipants}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isParticipantsOpen ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title="Participants"
          >
            <Users size={20} />
          </button>

          <button
            onClick={toggleChat}
            className={`p-3 sm:p-4 rounded-full transition-all duration-300 ${
              isChatOpen ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
            title="Chat"
          >
            <MessageSquare size={20} />
          </button>

          <button
            onClick={toggleTheme}
            className="p-3 sm:p-4 rounded-full transition-all duration-300 bg-gray-800 hover:bg-gray-700 text-white"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Leave Action */}
        <button
          onClick={handleLeave}
          className="p-3 sm:p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300 ml-2 shadow-[0_4px_15px_rgba(220,38,38,0.4)]"
          title="Leave Meeting"
        >
          <PhoneOff size={20} />
        </button>

      </div>
    </div>
  );
};

