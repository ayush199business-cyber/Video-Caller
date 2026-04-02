import React, { useRef, useEffect } from 'react';
import { MicOff, Monitor, User } from 'lucide-react';
import ReactionOverlay from './ReactionOverlay';

export const VideoPlayer = ({ 
  stream, 
  isLocal, 
  username, 
  isAudioMuted, 
  isVideoEnabled = true, 
  lastReaction, 
  reactionId, 
  isHandRaised,
  isSmall = false,
  type = 'camera' 
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      const videoEl = videoRef.current;
      videoEl.srcObject = stream;
      videoEl.muted = isLocal;
      videoEl.volume = 1;
      
      videoEl.play().catch(err => {
        console.warn("Autoplay blocked:", username, err);
      });
    }
  }, [stream, isLocal, username]);

  return (
    <div className={`relative flex items-center justify-center w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300`}>
      
      {/* Reaction Overlay (Only for main view/cameras) */}
      {!isSmall && type === 'camera' && (
        <ReactionOverlay emoji={lastReaction} reactionId={reactionId} />
      )}

      {/* Hand Raise Overlay */}
      {isHandRaised && !isSmall && (
        <div className="absolute top-4 right-4 z-30 animate-bounce">
          <div className="bg-yellow-500 text-white p-2 rounded-full shadow-lg border border-yellow-400">
            <span className="text-xl">✋</span>
          </div>
        </div>
      )}

      {/* Video Element */}
      {stream && (
        <video
          ref={videoRef}
          className={`w-full h-full ${type === 'screen' ? 'object-contain' : 'object-cover'} ${
            isLocal && type === 'camera' ? 'scale-x-[-1]' : ''
          } ${!isVideoEnabled && type === 'camera' ? 'opacity-0 absolute w-px h-px pointer-events-none' : ''}`}
          autoPlay
          playsInline
          muted={isLocal}
        />
      )}

      {/* Avatar/Placeholder for Video-Off */}
      {(!stream || (!isVideoEnabled && type === 'camera')) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-500 z-10 transition-opacity">
          <div className={`${isSmall ? 'w-10 h-10 text-sm' : 'w-20 h-20 text-2xl'} bg-white/5 rounded-full flex items-center justify-center mb-2 font-bold text-white/40 ring-1 ring-white/10 shadow-inner`}>
            {type === 'screen' ? <Monitor size={isSmall ? 16 : 32} /> : (username ? username.charAt(0).toUpperCase() : <User />)}
          </div>
          {!isSmall && <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{type === 'screen' ? 'Screen Share' : 'Camera Off'}</p>}
        </div>
      )}

      {/* Labels & Overlays (Only if not small) */}
      {!isSmall && (
        <div className="absolute bottom-4 left-4 flex gap-2 z-20">
          <div className="bg-black/60 px-3 py-1.5 rounded-lg text-xs font-bold text-white backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-2">
            {type === 'screen' && <Monitor size={14} className="text-indigo-400" />}
            {username} {isLocal && "(You)"}
          </div>
          {isAudioMuted && type === 'camera' && (
            <div className="bg-red-500/80 p-1.5 rounded-lg text-white backdrop-blur-md border border-red-500/20 shadow-sm flex items-center justify-center">
               <MicOff size={14} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

