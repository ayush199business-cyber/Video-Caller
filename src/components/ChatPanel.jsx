import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';

const ChatPanel = ({ messages, onSendMessage, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col w-full md:w-80 h-full bg-gray-900/40 backdrop-blur-xl border-l border-white/10 shadow-2xl relative animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gray-800/20">
        <h3 className="font-semibold text-white flex items-center gap-2 text-lg">
          In-Call Messages
        </h3>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 px-4">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 rotate-3 shadow-lg">
              <Send size={24} className="text-blue-400" />
            </div>
            <p className="text-sm text-gray-300">Messages can only be seen by people in the call and are deleted when you leave.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400">
                  {msg.isLocal ? 'You' : msg.sender}
                </span>
                <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
              </div>
              <div 
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-md transition-all hover:scale-[1.02] ${
                  msg.isLocal 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-gray-800/80 text-gray-100 rounded-tl-none border border-white/5'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-800/20 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Send a message..."
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg active:scale-95"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
