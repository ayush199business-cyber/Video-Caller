import React from 'react';
import { useParams } from 'react-router-dom';
import { Whiteboard } from '../components/Whiteboard';
import { useWhiteboardSync } from '../hooks/useWhiteboardSync';
import { useMobile } from '../hooks/useMobile';

export const WhiteboardPage = () => {
  const { id: roomId } = useParams();
  // FIX: uses shared useMobile hook instead of duplicated useEffect
  const isMobile = useMobile();
  // FIX: removed unused 'username' argument from useWhiteboardSync
  const { broadcastElements, remoteElements } = useWhiteboardSync(roomId);

  return (
    <div className="h-screen w-full bg-[#f8f9fa] overflow-hidden flex flex-col">
      <div className="absolute top-4 left-6 z-[100] flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
          Room: {roomId}
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          MeetSpace Live Whiteboard
        </div>
      </div>
      <Whiteboard
        onClose={() => window.close()}
        isStandalone={true}
        onElementsUpdate={broadcastElements}
        remoteElements={remoteElements}
        isMobile={isMobile}
      />
    </div>
  );
};
