import React, { useEffect, useState } from 'react';
import { WINNERS } from '../constants';

const WinnerCarousel: React.FC = () => {
  const [totalDistributed, setTotalDistributed] = useState(842000);

  // Incrementar o total distribuído a cada 60 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      // Incrementa entre 300.000 e 600.000
      const increment = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
      setTotalDistributed(prev => prev + increment);
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4 py-4 video-carousel-container">
      {/* Inline styles for the scrolling animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Pagamentos em Tempo Real
          </h2>
          <p className="text-xl font-black text-white tracking-tighter">
            {totalDistributed.toLocaleString('pt-AO')} <span className="text-sm text-primary">Kz</span>
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden w-full mask-linear-fade">
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-[#0a0a0c] to-transparent"></div>
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#0a0a0c] to-transparent"></div>

        <div className="flex w-max animate-scroll gap-3 px-0">
          {/* We triple the array to ensure smooth looping on wide screens */}
          {[...WINNERS, ...WINNERS, ...WINNERS, ...WINNERS].map((winner, idx) => (
            <div
              key={`${winner.id}-${idx}`}
              className="flex-shrink-0 bg-slate-900/50 backdrop-blur-sm border border-white/5 p-3 rounded-xl w-44 flex items-center gap-3 transition-colors hover:border-white/10 group"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:text-white transition-colors border border-white/5">
                {winner.initials}
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-300 truncate tracking-wide">{winner.name}</p>
                  <span className="text-[8px] text-slate-600 font-bold uppercase">{winner.time}</span>
                </div>
                <p className="text-xs font-black text-emerald-400 truncate tracking-tight">
                  {winner.amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WinnerCarousel;
