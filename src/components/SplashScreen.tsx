import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 scale-105 pointer-events-none'}`}
    >
      {/* Background Image - Unified & Mysterious */}
      <div className="absolute inset-0 z-0">
        <img
          src={require('../assets/splash_bg.png')}
          alt="Background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/30 mix-blend-overlay"></div>
      </div>

      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center justify-center animate-fade-up">
        {/* Logo Icon - Minimalist & Clean */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-white/20 blur-xl rounded-full animate-pulse"></div>
          <Sparkles className="w-16 h-16 text-indigo-100 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeWidth={1} />
        </div>

        <h1 className="text-3xl font-light text-white mb-3 tracking-[0.3em] font-sans drop-shadow-md">
          MBTIJU
        </h1>
        <div className="h-[1px] w-12 bg-indigo-300/50 mb-3"></div>
        <p className="text-indigo-200/80 text-[10px] tracking-[0.4em] uppercase font-light">
          Discover Your Destiny
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
