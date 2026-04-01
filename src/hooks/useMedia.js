import { useState, useCallback, useRef, useEffect } from 'react';

export const useMedia = () => {
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  
  const streamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);

  const startMedia = useCallback(async () => {
    // Prevent starting if already active
    if (streamRef.current) return streamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
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
  }, []); // NO dependencies! This is completely stable now.

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
    if (!streamRef.current) return;

    if (isScreenSharing) {
      // Stop screen sharing and revert to camera
      const currentVideoTrack = streamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) currentVideoTrack.stop();

      if (cameraVideoTrackRef.current) {
        // Re-enable original camera track
        const newStream = new MediaStream([cameraVideoTrackRef.current, ...streamRef.current.getAudioTracks()]);
        streamRef.current = newStream;
        setLocalStream(newStream);
        setIsScreenSharing(false);
        setIsVideoEnabled(true);
      } else {
        // If for some reason camera track was lost, try to restart media
        const freshStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = freshStream;
        cameraVideoTrackRef.current = freshStream.getVideoTracks()[0];
        setLocalStream(freshStream);
        setIsScreenSharing(false);
        setIsVideoEnabled(true);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Store original camera track to revert later
        cameraVideoTrackRef.current = streamRef.current.getVideoTracks()[0];

        // Create new combined stream
        const newStream = new MediaStream([screenTrack, ...streamRef.current.getAudioTracks()]);
        
        // Handle "Stop Sharing" button in browser UI
        screenTrack.onended = () => {
          toggleScreenShare(); // Revert back to camera
        };

        streamRef.current = newStream;
        setLocalStream(newStream);
        setIsScreenSharing(true);
        setIsVideoEnabled(true);
      } catch (err) {
        console.error("Screen share error:", err);
        if (err.name !== 'NotAllowedError') {
          setError("Failed to start screen sharing.");
        }
      }
    }
  }, [isScreenSharing, stopMedia]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, [stopMedia]);

  return {
    localStream,
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
