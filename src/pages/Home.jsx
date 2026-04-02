import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  LogIn, 
  Plus, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Cloud, 
  Users, 
  Clock, 
  Hash,
  Search,
  Monitor
} from 'lucide-react';
import { generateMeetingCode } from '../utils/helpers';
import cameraGlow from '../assets/camera_glow.png';

export const Home = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('select'); // 'select', 'create', 'join'

  const handleCreateMeeting = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your name first');
      return;
    }
    const code = generateMeetingCode();
    navigate(`/room/${code}`, { state: { username } });
  };

  const handleJoinByCode = (e) => {
    if (e) e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your name first');
      return;
    }
    if (!meetingCode.trim()) {
      setError('Meeting code is required');
      return;
    }
    navigate(`/room/${meetingCode}`, { state: { username } });
  };

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden pt-20">
      
      {/* Navigation Header */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto glass rounded-2xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.5)]">
               <Video className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              MeetSpace
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#" className="text-white border-b-2 border-indigo-500 pb-1">Home</a>
            <a href="#" className="hover:text-white transition-colors">Recent Meetings</a>
            <a href="#" className="hover:text-white transition-colors">Settings</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              A
            </div>
          </div>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12">
        
        {/* Left Column: Branding & Features */}
        <div className="flex flex-col gap-8 animate-fade-in-up">
          <div className="flex">
            <div className="glass px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold text-indigo-300 border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]">
              <Zap size={14} fill="currentColor" />
              <span className="uppercase tracking-widest">Instant & Serverless</span>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight italic">
              Meet<span className="text-indigo-500 drop-shadow-[0_0_30px_rgba(79,70,229,0.4)]">Space</span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-white/90">
              Instant Serverless Video Calls
            </h2>
            <p className="text-gray-400 text-lg max-w-lg leading-relaxed">
              Connect instantly with crystal-clear video calls. No downloads, no waiting — just pure communication powered by p2p technology.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <FeaturePill icon={<Zap size={16} />} label="Instant Join" color="indigo" />
            <FeaturePill icon={<ShieldCheck size={16} />} label="Secure & Private" color="emerald" />
            <FeaturePill icon={<Cloud size={16} />} label="Serverless & Fast" color="sky" />
          </div>

          {/* Decorative Camera Asset */}
          <div className="mt-8 relative w-full max-w-md aspect-square flex items-center justify-center">
             <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full animate-pulse"></div>
             <img 
                src={cameraGlow} 
                alt="3D Camera" 
                className="w-4/5 h-4/5 object-contain animate-float drop-shadow-[0_0_50px_rgba(79,70,229,0.3)]"
             />
          </div>
        </div>

        {/* Right Column: Action Card */}
        <div className="flex items-center justify-center lg:justify-end animate-fade-in-up [animation-delay:200ms]">
          <div className="w-full max-w-lg glass-card rounded-[40px] p-8 md:p-12 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-[80px] group-hover:bg-indigo-500/30 transition-all"></div>
            
            <div className="relative flex flex-col gap-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:border-indigo-500/30 transition-colors">
                  <Video size={32} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Start or Join a Meeting</h3>
                  <p className="text-gray-400 text-sm">Choose an option to connect with others</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl animate-shake">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 block ml-1">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(''); }}
                    placeholder="Enter your name"
                    className="w-full glass bg-white/5 border-white/10 focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-white outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={handleCreateMeeting}
                    className="w-full py-5 px-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-between group/btn shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 rounded-2xl">
                        <Plus size={24} className="text-white" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-lg">Create New Meeting</span>
                        <span className="text-white/60 text-xs">Start a fresh meeting instantly</span>
                      </div>
                    </div>
                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setMode(mode === 'join' ? 'select' : 'join')}
                    className="w-full py-5 px-6 rounded-3xl glass hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-between group/btn"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <LogIn size={24} className="text-gray-300" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-lg text-white">Join Existing Meeting</span>
                        <span className="text-gray-500 text-xs">Enter a meeting code to join</span>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-gray-500 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-grow h-px bg-white/5"></div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">or</span>
                  <div className="flex-grow h-px bg-white/5"></div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2 block ml-1">Quick Join with Code</label>
                  <form onSubmit={handleJoinByCode} className="relative group/input">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 flex items-center gap-1">
                      <Hash size={16} />
                    </div>
                    <input
                      type="text"
                      value={meetingCode}
                      onChange={(e) => { setMeetingCode(e.target.value.toUpperCase()); setError(''); }}
                      placeholder="Enter meeting code"
                      className="w-full glass bg-white/5 border-white/10 focus:border-indigo-500/50 rounded-2xl pl-12 pr-28 py-5 text-white outline-none transition-all font-mono"
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 px-6 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors active:scale-95 shadow-lg"
                    >
                      Join <ArrowRight size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Features/Stats Bar */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up [animation-delay:400ms]">
        <StatCard icon={<Users size={24} className="text-indigo-400" />} title="3.2M+" subtitle="Meetings Created" />
        <StatCard icon={<Clock size={24} className="text-emerald-400" />} title="Instant" subtitle="Join Time" />
        <StatCard icon={<ShieldCheck size={24} className="text-sky-400" />} title="End-to-End" subtitle="Encrypted" />
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

// Helper Components
const FeaturePill = ({ icon, label, color }) => {
  const colors = {
    indigo: "from-indigo-500/10 border-indigo-500/30 text-indigo-300",
    emerald: "from-emerald-500/10 border-emerald-500/30 text-emerald-300",
    sky: "from-sky-500/10 border-sky-500/30 text-sky-300"
  };

  return (
    <div className={`px-4 py-2 glass rounded-2xl flex items-center gap-2 text-sm font-semibold border ${colors[color]}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
};

const StatCard = ({ icon, title, subtitle }) => (
  <div className="glass px-8 py-6 rounded-[32px] flex items-center gap-6 border-white/5 transition-all hover:border-white/10 hover:bg-white/[0.05] group">
    <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <div>
      <h4 className="text-2xl font-bold text-white">{title}</h4>
      <p className="text-gray-500 text-sm font-medium">{subtitle}</p>
    </div>
  </div>
);
