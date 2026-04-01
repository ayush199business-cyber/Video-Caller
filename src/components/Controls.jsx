import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Controls = ({ isAudioEnabled, isVideoEnabled, isChatOpen, toggleAudio, toggleVideo, toggleChat, stopMedia }) => {
  const navigate = useNavigate();

  const handleLeave = () => {
    stopMedia();
    navigate('/'); // Go back to home
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 bg-gray-900/80 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-800 z-50">
      
      {/* Mic Toggle */}
      <button
        onClick={toggleAudio}
        className={`p-4 rounded-2xl transition duration-300 flex items-center justify-center ${
          isAudioEnabled 
            ? 'bg-gray-800 hover:bg-gray-700 text-white' 
            : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
        }`}
        title={isAudioEnabled ? 'Mute' : 'Unmute'}
      >
        {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
      </button>

      {/* Video Toggle */}
      <button
        onClick={toggleVideo}
        className={`p-4 rounded-2xl transition duration-300 flex items-center justify-center ${
          isVideoEnabled 
            ? 'bg-gray-800 hover:bg-gray-700 text-white' 
            : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
        }`}
        title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
      >
        {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
      </button>

      {/* Chat Toggle */}
      <button
        onClick={toggleChat}
        className={`p-4 rounded-2xl transition duration-300 flex items-center justify-center relative ${
          isChatOpen 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
            : 'bg-gray-800 hover:bg-gray-700 text-white'
        }`}
        title={isChatOpen ? 'Close Chat' : 'Open Chat'}
      >
        <MessageSquare size={24} />
      </button>


      {/* Leave Call */}
      <button
        onClick={handleLeave}
        className="p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white transition duration-300 ml-4 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        title="Leave Meeting"
      >
        <PhoneOff size={24} />
      </button>

    </div>
  );
};
