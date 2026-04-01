import React, { useEffect, useState } from 'react';

const ReactionOverlay = ({ emoji, reactionId }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (emoji && reactionId) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emoji, reactionId]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 overflow-hidden">
      <div className="animate-bounce-up text-6xl drop-shadow-2xl filter brightness-110">
        {emoji}
      </div>
      
      {/* Small floating particles */}
      {[...Array(6)].map((_, i) => (
        <div 
          key={i}
          className="absolute text-2xl animate-float-particle"
          style={{ 
            left: `${40 + Math.random() * 20}%`, 
            top: '60%',
            animationDelay: `${i * 0.2}s`,
            opacity: 0
          }}
        >
          {emoji}
        </div>
      ))}

      <style>{`
        @keyframes bounce-up {
          0% { transform: translateY(50px) scale(0.5); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          80% { transform: translateY(-40px) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(0.8); opacity: 0; }
        }
        @keyframes float-particle {
          0% { transform: translate(0, 0); opacity: 0.8; }
          100% { transform: translate(${(Math.random() - 0.5) * 150}px, -200px); opacity: 0; }
        }
        .animate-bounce-up {
          animation: bounce-up 3s ease-out forwards;
        }
        .animate-float-particle {
          animation: float-particle 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ReactionOverlay;
