import React, { useEffect, useState } from 'react';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#ec4899'];

const Celebration: React.FC = () => {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number; rotation: number }[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const newPieces = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in"></div>
      
      {/* Confetti */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px] w-3 h-6 rounded-sm animate-fall"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`
          }}
        />
      ))}

      {/* Message */}
      <div className="relative z-10 text-center animate-bounce-in">
        <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 drop-shadow-2xl filter">
          YAAAH!
        </h2>
        <p className="text-2xl md:text-4xl font-bold text-white mt-4 drop-shadow-md">
          You did it! 🎉
        </p>
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
        }
        .animate-bounce-in {
          animation: bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default Celebration;