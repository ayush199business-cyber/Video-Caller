import React, { useState } from 'react';
import { MessageSquare, Users, X } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { VideoPlayer } from './VideoPlayer';

const SidePanel = ({ 
  messages, 
  onSendMessage, 
  onClose, 
  peers, 
  username, 
  remoteStatuses,
  isAudioEnabled,
  isVideoEnabled,
  isLocalHandRaised,
  activeTab,
  setActiveTab,
  remoteStreams,
  remoteScreenStreams,
  localStream,
  screenStream,
  onSelectParticipant,
  activeParticipantId,
  isMobile
}) => {
  const participantsCount = Object.keys(peers).length + 1;

  const renderParticipantMedia = (id, stream, type, label, isVideoDisabled = false, isAudioMuted = false, isHandRaised = false) => {
    const isActive = activeParticipantId === id;
    if (!stream && type !== 'camera') return null;

    return (
      <div 
        key={id}
        onClick={() => onSelectParticipant(id)}
        className={`relative group cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border-2 ${
          isActive ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-white/5 hover:border-white/20'
        }`}
        style={{ aspectRatio: '16/9' }}
      >
        <VideoPlayer 
          stream={stream}
          isLocal={id === 'local' || id === 'local-screen'}
          username={label}
          isAudioMuted={isAudioMuted}
          isVideoEnabled={!isVideoDisabled}
          isHandRaised={isHandRaised}
          isSmall={true}
          type={type}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <p className="text-[10px] font-bold text-white uppercase tracking-widest bg-indigo-600 px-2 py-1 rounded-md">View {type}</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border-l border-white/10 shadow-2xl relative animate-in slide-in-from-right duration-300 ${isMobile ? 'w-full' : 'w-80'}`}>
      {/* Tabs Header */}
      <div className="flex items-center border-b border-white/10 bg-gray-800/20">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
            activeTab === 'chat' 
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare size={18} />
          <span>Chat</span>
          {messages.length > 0 && activeTab !== 'chat' && (
             <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all ${
            activeTab === 'participants' 
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-400/5' 
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
          <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
            {/* Local Participant Group */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">You</h4>
                {isLocalHandRaised && <span className="text-sm">✋</span>}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {renderParticipantMedia('local', localStream, 'camera', username, !isVideoEnabled, !isAudioEnabled, isLocalHandRaised)}
                {screenStream && renderParticipantMedia('local-screen', screenStream, 'screen', 'Your Screen')}
              </div>
            </div>

            {/* Remote Participants Groups */}
            {Object.entries(peers).map(([peerId, peerData]) => {
              const status = remoteStatuses[peerId] || { video: true, audio: true };
              const rStream = remoteStreams[peerId];
              const sStream = remoteScreenStreams[peerId];

              return (
                <div key={peerId} className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{peerData.username}</h4>
                    {status.isHandRaised && <span className="text-sm">✋</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {renderParticipantMedia(peerId, rStream, 'camera', peerData.username, !status.video, !status.audio, status.isHandRaised)}
                    {sStream && renderParticipantMedia(`${peerId}-screen`, sStream, 'screen', `${peerData.username}'s Screen`)}
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
