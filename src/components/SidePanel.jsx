import React, { useState } from 'react';
import { MessageSquare, Users, X } from 'lucide-react';
import ChatPanel from './ChatPanel';

const SidePanel = ({ 
  messages, 
  onSendMessage, 
  onClose, 
  peers, 
  username, 
  remoteStatuses,
  isAudioEnabled,
  isVideoEnabled,
  isHandRaised,
  initialTab = 'chat'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  const participantsCount = Object.keys(peers).length + 1;

  return (
    <div className="flex flex-col w-full md:w-80 h-full bg-gray-900/40 backdrop-blur-xl border-l border-white/10 shadow-2xl relative animate-in slide-in-from-right duration-300">
      {/* Tabs Header */}
      <div className="flex items-center border-b border-white/10 bg-gray-800/20">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
            activeTab === 'chat' 
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare size={18} />
          <span>Chat</span>
          {messages.length > 0 && activeTab !== 'chat' && (
             <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
            activeTab === 'participants' 
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <Users size={18} />
          <span>People</span>
          <span className="ml-1 bg-gray-800 px-1.5 py-0.5 rounded text-[10px] text-gray-300">
            {participantsCount}
          </span>
        </button>
        <button 
          onClick={onClose}
          className="p-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' ? (
          <ChatPanel 
            messages={messages} 
            onSendMessage={onSendMessage} 
            isEmbedded={true}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">In Call</h4>
            
            {/* Local Participant */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {username?.charAt(0).toUpperCase()}
                </div>
                <div>
                   <p className="text-sm font-semibold text-white">{username} (You)</p>
                   <p className="text-[10px] text-gray-500">Host</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 {isHandRaised && (
                    <span className="text-xl animate-bounce">✋</span>
                 )}
              </div>
            </div>

            {/* Remote Participants */}
            {Object.entries(peers).map(([peerId, peerData]) => {
              const status = remoteStatuses[peerId] || { video: true, audio: true };
              return (
                <div key={peerId} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 font-bold border border-white/10">
                      {peerData.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <p className="text-sm font-medium text-gray-200">{peerData.username}</p>
                       <p className="text-[10px] text-gray-500">
                          {status.video ? 'Camera On' : 'Camera Off'} • {status.audio ? 'Mic On' : 'Muted'}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-lg">
                     {status.isHandRaised && (
                        <span className="animate-bounce">✋</span>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
