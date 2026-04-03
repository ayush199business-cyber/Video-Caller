import { useState, useCallback, useRef, useEffect } from 'react';

export const useMedia = () => {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);

  const startMedia = useCallback(async () => {
    // Prevent starting if already active
    if (streamRef.current) return streamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: false },
          sampleRate: 48000,
          sampleSize: 16,
          channelCount: 1
        }
      });
      streamRef.current = stream;
      cameraVideoTrackRef.current = stream.getVideoTracks()[0];
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setError("Camera or Microphone access denied. Please check permissions.");
      return null;
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen sharing but KEEP camera active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      // Basic checks
      if (!window.isSecureContext) {
        setError("Screen sharing requires a secure HTTPS connection.");
        return;
      }

      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen sharing is not supported in this browser.");
        return;
      }

      try {
        // Mobile browsers often fail if we specify 'monitor' or 'cursor'
        // We use simple constraints for maximum compatibility
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        const screenTrack = screen.getVideoTracks()[0];

        // Handle "Stop Sharing" button in browser UI
        screenTrack.onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };

        screenStreamRef.current = screen;
        setScreenStream(screen);
        setIsScreenSharing(true);
        setError(null);
      } catch (err) {
        console.error("Screen share error:", err);
        
        let msg = "Failed to start screen sharing.";
        if (err.name === 'NotAllowedError') {
          msg = "Permission denied. Please allow screen recording.";
        } else if (err.name === 'NotSupportedError') {
          msg = "Screen sharing is not supported on this device/browser.";
        } else {
          msg = `Error: ${err.message || err.name}`;
        }
        
        setError(msg);
      }
    }
  }, [isScreenSharing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, [stopMedia]);

  return {
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
    error
  };
};
