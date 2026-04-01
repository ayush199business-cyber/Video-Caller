import React, { useRef, useEffect } from 'react';
import { MicOff } from 'lucide-react';
import ReactionOverlay from './ReactionOverlay';

export const VideoPlayer = ({ 
  stream, 
  isLocal, 
  username, 
  isAudioMuted, 
  isVideoEnabled = true, 
  lastReaction, 
  reactionId, 
  isHandRaised 
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      const videoEl = videoRef.current;
      videoEl.srcObject = stream;
      
      // Override React reconciler bugs by enforcing hardware values DOM-side
      videoEl.muted = isLocal;
      videoEl.volume = 1;
      
      // Explicit play is MANDATORY for WebRTC streams arriving asynchronously
      videoEl.play().catch(err => {
        console.warn("Browser blocked autoplay for peer:", username, err);
      });
    }
  }, [stream, isLocal, username]);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 transition-all duration-300">
      
      {/* Reaction Overlay */}
      <ReactionOverlay emoji={lastReaction} reactionId={reactionId} />

      {/* Hand Raise Overlay */}
      {isHandRaised && (
        <div className="absolute top-4 right-4 z-30 animate-bounce">
          <div className="bg-yellow-500 text-white p-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.6)] border-2 border-yellow-400">
            <span className="text-xl">✋</span>
          </div>
        </div>
      )}

      {/* ALWAYS render the video element if stream exists so AUDIO continues to play even if video is visually 'off' */}
      {stream && (
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${!isVideoEnabled ? 'opacity-0 absolute w-px h-px pointer-events-none' : ''}`}
          autoPlay
          playsInline
          muted={isLocal}
        />
      )}

      {/* Render the Avatar overlay when video is off */}
      {(!stream || !isVideoEnabled) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500 z-10">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-2xl font-semibold text-gray-400 shadow-inner ring-4 ring-gray-800/50">
            {username ? username.charAt(0).toUpperCase() : '?'}
          </div>
          <p className="font-medium text-gray-400">Camera Off</p>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
        <div className="bg-black/60 px-3 py-1.5 rounded-lg text-sm font-medium text-white backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-2">
          {username} {isLocal && "(You)"}
        </div>
        {isAudioMuted && (
          <div className="bg-red-500/80 p-1.5 rounded-lg text-white backdrop-blur-md border border-red-500/50 shadow-sm flex items-center justify-center">
             <MicOff size={16} />
          </div>
        )}
      </div>
    </div>
  );
};

