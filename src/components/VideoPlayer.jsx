import React, { useRef, useEffect } from 'react';
import { MicOff } from 'lucide-react';

export const VideoPlayer = ({ stream, isLocal, username, isAudioMuted, isVideoEnabled = true }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      const videoEl = videoRef.current;
      videoEl.srcObject = stream;
      
      // Override React reconciler bugs by enforcing hardware values DOM-side
      videoEl.muted = isLocal;
      videoEl.volume = 1;
      
      // Explicit play is MANDATORY for WebRTC streams arriving asynchronously
      // Otherwise Safari/Chrome strictly pause the stream thread waiting for user clicks
      videoEl.play().catch(err => {
        console.warn("Browser blocked autoplay for peer:", username, err);
      });
    }
  }, [stream, isLocal, username]);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
      {/* ALWAYS render the video element if stream exists so AUDIO continues to play even if video is visually 'off' */}
      {/* Replaced 'hidden' with absolute transparent 1-pixel technique so OS doesn't sleep the media process */}
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
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 text-2xl font-semibold text-gray-400 shadow-inner">
            {username ? username.charAt(0).toUpperCase() : '?'}
          </div>
          <p className="font-medium">Camera Off</p>
        </div>
      )}

      {/* Overlays */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <div className="bg-black/60 px-3 py-1.5 rounded-lg text-sm font-medium text-white backdrop-blur-sm border border-white/10 shadow-sm flex items-center gap-2">
          {username} {isLocal && "(You)"}
        </div>
        {isAudioMuted && (
          <div className="bg-red-500/80 p-1.5 rounded-lg text-white backdrop-blur-sm border border-red-500/50 shadow-sm flex items-center justify-center">
             <MicOff size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
