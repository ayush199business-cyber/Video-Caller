import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, LogIn, Plus } from 'lucide-react';
import { generateMeetingCode } from '../utils/helpers';

export const Home = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('select'); // 'select', 'create', 'join'

  const handleCreateMeeting = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    const code = generateMeetingCode();
    navigate(`/room/${code}`, { state: { username } });
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (!username.trim() || !meetingCode.trim()) {
      setError('Both Username and Meeting Code are required');
      return;
    }
    navigate(`/room/${meetingCode}`, { state: { username } });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.15)] bg-gray-900 border border-gray-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center flex flex-col items-center">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md mb-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
            <Video size={40} className="text-white drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MeetSpace</h1>
          <p className="text-indigo-100 mt-2 font-medium opacity-90">Instant Serverless Video Calls</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-xl mb-6 flex items-center shadow-inner">
              {error}
            </div>
          )}

          {mode === 'select' && (
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { setMode('create'); setError(''); }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-2xl transition duration-300 flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(79,70,229,0.3)] transform hover:-translate-y-1"
              >
                <Plus size={22} />
                Create New Meeting
              </button>
              
              <div className="relative py-4 flex items-center">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-medium">Or</span>
                <div className="flex-grow border-t border-gray-800"></div>
              </div>

              <button 
                onClick={() => { setMode('join'); setError(''); }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-2xl transition duration-300 flex items-center justify-center gap-3 border border-gray-700 transform hover:-translate-y-1"
              >
                <LogIn size={22} />
                Join Existing Meeting
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateMeeting} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-black/40 border border-gray-700 focus:border-indigo-500 rounded-xl px-5 py-4 text-white placeholder-gray-600 outline-none transition duration-200 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                 <button 
                    type="button"
                    onClick={() => setMode('select')}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-xl transition duration-200"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  >
                    Start Call
                  </button>
              </div>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinMeeting} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Meeting Code</label>
                <input
                  type="text"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                  placeholder="e.g. X9Y2ZL"
                  className="w-full bg-black/40 border border-gray-700 focus:border-indigo-500 rounded-xl px-5 py-4 text-white placeholder-gray-600 outline-none transition duration-200 font-mono tracking-widest uppercase focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-black/40 border border-gray-700 focus:border-indigo-500 rounded-xl px-5 py-4 text-white placeholder-gray-600 outline-none transition duration-200 focus:ring-2 focus:ring-indigo-500/20 shadow-inner"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                 <button 
                    type="button"
                    onClick={() => setMode('select')}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-xl transition duration-200"
                  >
                    Back
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 shadow-[0_0_20px_rgba(79,70,229,0.3)]"
                  >
                    Join Call
                  </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
