import React, { useEffect, useState, useMemo } from 'react';

// FIX: particle data is computed once per reaction trigger via useMemo,
// NOT inside a <style> tag with Math.random() — that pattern leaks DOM nodes on every render.
const ReactionOverlay = ({ emoji, reactionId }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (emoji && reactionId) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [emoji, reactionId]);

  // Pre-compute random particle positions once per reaction (keyed to reactionId)
  const particles = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      left:  `${38 + Math.random() * 24}%`,
      tx:    `${(Math.random() - 0.5) * 160}px`,
      delay: `${i * 0.18}s`,
    })),
    [reactionId] // recalculate only when a new reaction fires
  );

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 overflow-hidden">
      {/* Main emoji — bounces up and fades */}
      <div
        className="text-6xl drop-shadow-2xl filter brightness-110"
        style={{ animation: 'ms-bounce-up 3s ease-out forwards' }}
      >
        {emoji}
      </div>

      {/* Satellite particles with inline style props — no injected <style> tags */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute text-2xl"
          style={{
            left: p.left,
            top: '60%',
            opacity: 0,
            animationDelay: p.delay,
            animation: `ms-float-particle 2s ease-out ${p.delay} forwards`,
            '--p-tx': p.tx,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};

export default ReactionOverlay;
