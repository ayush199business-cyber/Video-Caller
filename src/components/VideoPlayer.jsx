import React, { useRef, useEffect } from 'react';
import { MicOff } from 'lucide-react';

export const VideoPlayer = ({ stream, isLocal, username, isAudioMuted, isVideoEnabled = true }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800">
      {/* ALWAYS render the video element if stream exists so AUDIO continues to play even if video is visually 'off' */}
      {stream && (
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''} ${!isVideoEnabled ? 'hidden' : ''}`}
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

      {/* Overlay - Username and Status */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm text-white font-medium flex items-center gap-2">
          <span className="truncate max-w-[150px]">{username || 'Guest'}</span>
          {isLocal && <span className="text-xs text-gray-400 ml-1">(You)</span>}
        </div>
        
        {isAudioMuted && (
          <div className="bg-red-500/80 backdrop-blur-md p-1.5 rounded-lg text-white">
            <MicOff size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
