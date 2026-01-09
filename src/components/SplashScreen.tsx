import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 800); // Slightly longer fade out for smoothness
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 scale-105 pointer-events-none'
        }`}
    >
      {/* Ambient Background Glow - Subtle & Unified */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse animation-delay-2000"></div>
      </div>

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center animate-fade-up">
        <div className="relative w-40 h-40 mb-8">
          {/* Simple Glow behind logo */}
          <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full"></div>
          <img
            src={require('../assets/splash.png')}
            alt="MBTIJU Logo"
            className="w-full h-full object-contain relative z-10 drop-shadow-2xl animate-float"
          />
        </div>

        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200 mb-3 tracking-widest drop-shadow-lg">
          MBTIJU
        </h1>
        <p className="text-indigo-200/70 text-sm tracking-[0.3em] uppercase font-light">
          Discover Your Destiny
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
