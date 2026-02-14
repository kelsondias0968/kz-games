import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Game } from '../types';
import { supabase } from '../lib/supabase';

interface GameDetailProps {
  game: Game;
  onBack: () => void;
  balance: number;
  userId: string | null;
  onPlay: (cost: number) => void;
  onWin?: (amount: number) => void;
  isMuted: boolean;
}

import img1 from '../IMG/1.jpg';
import img2 from '../IMG/2.png';
import img3 from '../IMG/2.webp';

const GameDetail: React.FC<GameDetailProps> = ({ game, onBack, balance, userId, onPlay, onWin, isMuted }) => {
  const [purchased, setPurchased] = useState(false);
  const [isScratched, setIsScratched] = useState(false);
  const [scratchedTiles, setScratchedTiles] = useState<number[]>([]);
  const [isWinner, setIsWinner] = useState(false);

  // Intelligent Game Logic State
  const [consecutiveWins, setConsecutiveWins] = useState(0);

  // No longer a useMemo that re-triggers mid-game
  const [activeGameData, setActiveGameData] = useState<{
    grid: string[];
    win: boolean;
    winIcon: string;
    winAmount: number;
  } | null>(null);

  const generateGameData = useCallback(() => {
    const icons = [img1, img2, img3, img1, img2, img3];
    let winRate = game.price <= 500 ? 0.45 : 0.35;
    if (consecutiveWins > 2) winRate -= 0.15;

    const isWinner = Math.random() < winRate;
    let grid = Array(9).fill('');
    let winIcon = '';

    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    if (isWinner) {
      winIcon = icons[Math.floor(Math.random() * icons.length)];
      const line = winningLines[Math.floor(Math.random() * winningLines.length)];
      line.forEach(index => { grid[index] = winIcon; });
      grid = grid.map((val) => val !== '' ? val : icons[Math.floor(Math.random() * icons.length)]);
    } else {
      const isNearMiss = Math.random() < 0.60;
      if (isNearMiss) {
        const line = winningLines[Math.floor(Math.random() * winningLines.length)];
        winIcon = icons[Math.floor(Math.random() * icons.length)];
        grid[line[0]] = winIcon;
        grid[line[1]] = winIcon;
        grid = grid.map((val, idx) => {
          if (val !== '') return val;
          let icon = icons[Math.floor(Math.random() * icons.length)];
          if (idx === line[2]) while (icon === winIcon) icon = icons[Math.floor(Math.random() * icons.length)];
          return icon;
        });
      } else {
        grid = Array.from({ length: 9 }).map(() => icons[Math.floor(Math.random() * icons.length)]);
      }

      winningLines.forEach(line => {
        if (grid[line[0]] === grid[line[1]] && grid[line[1]] === grid[line[2]]) {
          const others = icons.filter(i => i !== grid[line[0]]);
          grid[line[2]] = others[Math.floor(Math.random() * others.length)];
        }
      });
    }

    // Calculate Win Amount immediately
    let amount = 0;
    if (isWinner) {
      const multiplier = game.price === 2500 ? 5 : game.price === 1000 ? 3 : 2;
      const baseWin = game.price * multiplier;
      const bonus = Math.floor(Math.random() * (game.price * 0.5));
      amount = baseWin + bonus;
    }

    return { grid, win: isWinner, winIcon, winAmount: amount };
  }, [consecutiveWins, game.price]);

  const recordBet = useCallback(async (data: any) => {
    if (!data) return;
    const { error } = await supabase
      .from('bets')
      .insert({
        user_id: userId,
        game_id: game.id,
        game_name: game.name,
        cost: game.price,
        is_winner: data.win,
        win_amount: data.winAmount,
        result_grid: data.grid
      });

    if (error) console.error('Error recording bet:', error);
  }, [game, userId]);

  // Initial generation when starting
  useEffect(() => {
    if (purchased && !activeGameData) {
      setActiveGameData(generateGameData());
    }
  }, [purchased, activeGameData, generateGameData]);

  const recordBetOld = useCallback(async () => {
    // This is now replaced by recordBet(activeGameData)
  }, []);

  const playSound = useCallback((type: 'purchase' | 'scratch' | 'win' | 'lose') => {
    if (isMuted) return;
    let url = '';
    let volume = 0.4;

    switch (type) {
      case 'purchase':
        url = 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3'; // Coins / Cash register
        volume = 0.5;
        break;
      case 'scratch':
        url = 'https://assets.mixkit.co/active_storage/sfx/1104/1104-preview.mp3'; // Gentle paper/scratch
        volume = 0.2;
        break;
      case 'win':
        url = 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'; // Win celebration bells
        volume = 0.8;
        break;
      case 'lose':
        url = 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3'; // Subtle thud
        volume = 0.3;
        break;
    }

    if (url) {
      const audio = new Audio(url);
      audio.volume = volume;
      audio.play().catch((err) => console.log("Erro ao tocar som (Autoplay blocked?):", err));
    }
  }, [isMuted]);

  const handleTileScratch = (index: number) => {
    if (!purchased || scratchedTiles.includes(index) || isScratched) return;

    setScratchedTiles(prev => [...prev, index]);
    playSound('scratch');

    // Auto-complete when 6 tiles are scratched or when user scratches enough
    if (scratchedTiles.length + 1 >= 7) {
      handleCompleteReveal();
    }
  };

  const handleCompleteReveal = () => {
    if (isScratched || !activeGameData) return;
    setIsScratched(true);
    recordBet(activeGameData);

    if (activeGameData.win) {
      setConsecutiveWins(prev => prev + 1);
    } else {
      setConsecutiveWins(0);
    }

    setTimeout(() => {
      if (activeGameData.win) {
        playSound('win');
        onWin?.(activeGameData.winAmount);
      } else {
        playSound('lose');
      }
    }, 200);
  };

  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    if (processing) return;
    if (balance < game.price) {
      alert("Saldo insuficiente!");
      return;
    }

    setProcessing(true);
    try {
      await onPlay(game.price); // Wait for App.tsx to process balance
      playSound('purchase');

      // Reset states for new game
      setScratchedTiles([]);
      setIsScratched(false);
      setActiveGameData(null);
      setPurchased(true);
    } catch (e) {
      console.error("Purchase failed", e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <header className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-300 transition-transform active:scale-90 shadow-lg">
          <span className="material-icons-round">arrow_back</span>
        </button>
        <h1 className="font-black text-lg uppercase italic tracking-tighter">Zona de Jogo</h1>
      </header>

      {/* Game Card Header */}
      <section className="relative overflow-hidden rounded-[32px] h-32 bg-gradient-to-br from-slate-900 to-black border border-white/5 shadow-2xl">
        <img alt={game.name} className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" src={game.image} />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">{game.name}</h2>
          <p className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">PRÊMIO: {game.maxPrize}</p>
        </div>
      </section>

      {/* Main Interaction Area */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-500">Toque para Raspar</h3>
          {purchased && (
            <span className="text-[10px] font-black text-primary uppercase">{scratchedTiles.length}/9 Revelados</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 rounded-[40px] border-4 border-slate-800 shadow-inner relative aspect-square">
          {(activeGameData?.grid || Array(9).fill('')).map((icon: string, i: number) => {
            const isRevealed = scratchedTiles.includes(i) || isScratched;
            const isWinningIcon = activeGameData?.win && icon === activeGameData?.winIcon;

            return (
              <div
                key={i}
                onClick={() => handleTileScratch(i)}
                onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) handleTileScratch(i) }}
                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group"
              >
                {/* Icon Background (Result) */}
                <div className={`absolute inset-0 bg-slate-950 flex items-center justify-center border border-slate-800/50`}>
                  <img
                    src={icon}
                    alt="symbol"
                    className={`w-[70%] h-[70%] object-contain transition-all duration-700 ${isWinningIcon && isScratched ? 'scale-125 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-bounce' : 'opacity-100'}`}
                  />
                </div>

                {/* Metallic Scratch Layer */}
                {!isRevealed && (
                  <div className="absolute inset-0 z-10 transition-opacity duration-300">
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-500 to-slate-800 flex items-center justify-center border border-white/10 shadow-lg">
                      <div className="opacity-20 flex flex-col items-center">
                        <span className="material-icons-round text-white text-lg">casino</span>
                        <span className="text-[6px] font-black text-white uppercase tracking-tighter">KZ</span>
                      </div>
                      {/* Noise profile for texture */}
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    </div>
                  </div>
                )}

                {/* Lock Overlay (If not purchased) */}
                {!purchased && (
                  <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="material-icons-round text-slate-400/50 text-xl">lock</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Winner Overlay */}
          {isScratched && activeGameData && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in fade-in duration-300">
              <div className={`w-full bg-slate-950/90 backdrop-blur-xl p-8 rounded-[40px] border-2 ${activeGameData.win ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)]' : 'border-slate-800'} text-center space-y-6 shadow-2xl`}>
                <span className={`material-icons-round text-6xl ${activeGameData.win ? 'text-yellow-500 animate-pulse' : 'text-slate-600'}`}>
                  {activeGameData.win ? 'workspace_premium' : 'sentiment_dissatisfied'}
                </span>
                <div>
                  <h4 className={`text-2xl font-black italic uppercase tracking-tighter ${activeGameData.win ? 'text-yellow-500' : 'text-white'}`}>
                    {activeGameData.win ? 'VOCÊ GANHOU!' : 'TENTE NOVAMENTE'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {activeGameData.win ? `Prêmio de ${activeGameData.winAmount.toLocaleString('pt-AO')} Kz creditado!` : 'Sua sorte está chegando. Continue jogando!'}
                  </p>
                </div>
                <button
                  onClick={() => { setPurchased(false); setIsScratched(false); setScratchedTiles([]); setActiveGameData(null); }}
                  className="w-full bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-2xl text-xs uppercase transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  Jogar Novamente
                </button>
                <button onClick={onBack} className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Voltar</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      {!purchased && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40 animate-in slide-in-from-bottom-5">
          <button
            onClick={handlePurchase}
            className="w-full bg-primary hover:bg-blue-600 text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl border border-white/10"
          >
            <span className="material-icons-round">local_activity</span>
            <span className="uppercase tracking-tight text-sm font-black">Comprar Bilhete: {game.price.toLocaleString('pt-AO')} Kz</span>
          </button>
        </div>
      )}

      {/* Responsability Footer */}
      <div className="bg-slate-900/30 rounded-3xl p-5 border border-slate-800/50 text-center opacity-60">
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          Jogue com responsabilidade. Proibido para menores de 18 anos. Gerado via algorítmo seguro auditado.
        </p>
      </div>
    </div>
  );
};

export default GameDetail;
