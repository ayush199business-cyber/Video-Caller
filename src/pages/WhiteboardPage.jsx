import React from 'react';
import { useParams } from 'react-router-dom';
import { Whiteboard } from '../components/Whiteboard';

export const WhiteboardPage = () => {
  const { id } = useParams();

  return (
    <div className="h-screen w-full bg-[#f8f9fa]">
      <div className="absolute top-4 left-6 z-[100] flex items-center gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
          Room: {id}
        </div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          MeetSpace Live Whiteboard
        </div>
      </div>
      <Whiteboard onClose={() => window.close()} />
    </div>
  );
};
