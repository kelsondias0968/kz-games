
import React from 'react';
import { View } from '../types';


interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  balance: number;
  userName?: string;
  isAuthenticated?: boolean;
  onNavigate: (view: View) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeView,
  balance,
  userName,
  isAuthenticated,
  onNavigate,
  onOpenDeposit,
  onOpenWithdraw,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col max-w-lg mx-auto pb-24 border-x border-slate-900 shadow-2xl shadow-black relative">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-black/20 backdrop-blur-3xl border-b border-white/5 px-4 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={() => onNavigate('home')}>
          {/* Logo Increased Size */}
          <img src="/logo.png" alt="Kz GAMES" className="h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className="w-10 h-10 rounded-full bg-slate-800/50 text-slate-400 flex items-center justify-center hover:text-white hover:bg-slate-700 transition-colors active:scale-90"
          >
            <span className="material-icons-round text-lg">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Logged In State - Clickable Balance */}
              <div
                onClick={onOpenWithdraw}
                className="bg-card-dark px-4 py-2 rounded-full border border-slate-700/50 flex items-center gap-3 shadow-lg cursor-pointer hover:border-primary/50 transition-all active:scale-95"
              >
                <div className="flex flex-col items-end leading-none">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{userName || 'Jogador'}</span>
                  <span className="text-sm font-black text-primary">{balance.toLocaleString('pt-AO')} Kz</span>
                </div>
                <div className="bg-primary/20 p-1 rounded-full">
                  <span className="material-icons-round text-sm text-primary">account_balance_wallet</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('profile')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${activeView === 'profile' ? 'bg-primary text-white ring-2 ring-primary/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                <span className="material-icons-round text-xl">person</span>
              </button>
            </>
          ) : (
            /* Guest State */
            <button
              onClick={() => onNavigate('auth')}
              className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-icons-round text-sm">person_add</span>
              Criar Conta
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-6 animate-in fade-in duration-500">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg glass border-t border-slate-800 px-2 py-2 z-50 backdrop-blur-xl bg-black/40">
        <div className="flex items-center justify-between px-2">
          <button
            onClick={() => onNavigate('home')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === 'home' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="material-icons-round text-2xl">home</span>
            <span className="text-[9px] font-black uppercase tracking-wide">Início</span>
          </button>

          {/* Enabled Games Button */}
          <button
            onClick={() => onNavigate('games')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === 'games' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="material-icons-round text-2xl">grid_view</span>
            <span className="text-[9px] font-black uppercase tracking-wide">Jogos</span>
          </button>

          {isAuthenticated && (
            <div className="relative -top-8 group">
              <div className="absolute inset-0 bg-primary blur-xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <button
                onClick={onOpenDeposit}
                className="relative bg-primary w-16 h-16 rounded-full flex items-center justify-center text-white border-[6px] border-background-dark shadow-2xl transition-transform active:scale-95 group-hover:-translate-y-1"
              >
                <span className="material-icons-round text-3xl drop-shadow-md">add</span>
              </button>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-primary px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap uppercase tracking-widest scale-0 group-hover:scale-100 transition-transform origin-top">Depositar</span>
            </div>
          )}

          <button
            onClick={() => onNavigate('bets')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === 'bets' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="material-icons-round text-2xl">history</span>
            <span className="text-[9px] font-black uppercase tracking-wide">Apostas</span>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeView === 'profile' ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <span className="material-icons-round text-2xl">person</span>
            <span className="text-[9px] font-black uppercase tracking-wide">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
