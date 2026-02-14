
import React, { useState, useCallback, useEffect } from 'react';
import { View, Game } from './types';
import Layout from './components/Layout';
import Home from './pages/Home';
import GameDetail from './pages/GameDetail';
import Profile from './pages/Profile';
import Bets from './pages/Bets';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import VerificationGuide from './pages/VerificationGuide';
import DepositModal from './components/DepositModal';
import WithdrawalModal from './components/WithdrawalModal';
import GameList from './components/GameList';
import { supabase } from './lib/supabase';
import { useDepositPolling } from './lib/useDepositPolling';

// Helper to safely parse balance
const parseBalance = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (val && typeof val === 'object' && 'balance' in val) return parseBalance(val.balance);
  return 0;
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('home');
  const [session, setSession] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>(''); // Add User Name State
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [balance, setBalance] = useState<number>(0); // Default to 0, not placeholder
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [bankIban, setBankIban] = useState<string>('');
  const [bankExpress, setBankExpress] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserId(session?.user?.id || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Detectar hash na URL para acesso direto ao admin
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove o #
    if (hash === ':bol$') {
      setActiveView('admin');
    }
  }, []);

  // 1. Fetch balance with auto-fix for missing profiles
  const fetchBalance = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase.from('profiles').select('balance, name, is_verified, bank_iban, bank_express').eq('id', userId).maybeSingle();

    if (error) {
      console.error('Fetch error:', error.message);
      return;
    }

    if (!data) {
      console.log('🆕 Creating initial profile...');
      await supabase.from('profiles').insert({ id: userId, balance: 0, email: session?.user?.email });
      setBalance(0);
    } else {
      setBalance(Number(data.balance || 0));
      if (data.name) setUserName(data.name.split(' ')[0]);
      setIsVerified(!!data.is_verified);
      setBankIban(data.bank_iban || '');
      setBankExpress(data.bank_express || '');
    }
  }, [userId, session]);

  // 2. Simplified Balance Updater (Direct & Reactive)
  const syncBalanceDB = async (amount: number) => {
    if (!userId) return;

    // Use RPC for atomic operations (prevents balance drift)
    // Note: Direct updates are blocked by the 'trg_protect_balance' trigger for security.
    const { data: newBalance, error } = await supabase.rpc('increment_balance', {
      _user_id: userId,
      _amount: amount
    });

    if (error) {
      console.error('❌ Balance sync failed:', error.message);
      throw new Error(error.message || "Erro ao sincronizar saldo");
    } else if (newBalance !== null) {
      setBalance(Number(newBalance));
    }
  };

  // 3. Fluid Betting Logic (Fast Optimistic UI)
  const handlePlay = useCallback(async (cost: number) => {
    if (balance < cost) {
      setIsDepositModalOpen(true); // Open deposit modal directly
      return;
    }

    // Immediate UI Feedback
    const prevBalance = balance;
    setBalance(prev => prev - cost);

    try {
      await syncBalanceDB(-cost);
    } catch (err: any) {
      setBalance(prevBalance); // Revert on failure
      alert(err.message || "Erro na transação.");
    }
  }, [balance, userId]);

  const handleWin = useCallback(async (amount: number) => {
    setBalance(prev => prev + amount); // Dynamic UI
    await syncBalanceDB(amount);
  }, [userId]);

  const handleDeposit = useCallback(async (amount: number) => {
    setBalance(prev => prev + amount);
    await syncBalanceDB(amount);
  }, [userId]);

  const handleWithdraw = useCallback(async (amount: number, details: string) => {
    if (balance < amount) return;
    console.log(`💸 Solicitando saque de ${amount} para: ${details}`);
    setBalance(prev => prev - amount);
    await syncBalanceDB(-amount);
    alert("Saque solicitado com sucesso!");
  }, [balance, userId]);

  useEffect(() => {
    if (userId) {
      fetchBalance();

      const channel = supabase
        .channel('realtime-balance')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload: any) => {
            if (payload.new && payload.new.balance !== undefined) {
              setBalance(Number(payload.new.balance));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchBalance, userId]);

  // Polling automático de depósitos a cada 15 segundos
  useDepositPolling({
    enabled: !!userId, // Só ativa quando o usuário está logado
    interval: 15000, // 15 segundos
    onUpdate: fetchBalance // Atualiza o saldo quando um depósito for processado
  });

  const handleNavigate = useCallback((view: View) => {
    setActiveView(view);
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game);
    setActiveView('game');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="dark">
      {activeView === 'admin' ? (
        <Admin />
      ) : (
        <Layout
          activeView={activeView}
          balance={balance}
          userName={userName}
          isAuthenticated={!!userId}
          onNavigate={handleNavigate}
          onOpenDeposit={() => setIsDepositModalOpen(true)}
          onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        >
          {activeView === 'home' && (
            <Home onSelectGame={handleSelectGame} />
          )}

          {activeView === 'games' && (
            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2 mb-6">
                <span className="material-icons-round text-primary text-4xl animate-bounce">casino</span>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Sala de Jogos</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Escolha sua raspadinha e comece agora</p>
              </div>
              <GameList onSelectGame={handleSelectGame} />
            </div>
          )}

          {activeView === 'auth' && (
            <Auth onAuthSuccess={() => setActiveView('home')} />
          )}

          {activeView === 'game' && selectedGame && (
            userId ? (
              <GameDetail
                game={selectedGame}
                balance={balance}
                userId={userId}
                onBack={() => handleNavigate('home')}
                onPlay={handlePlay}
                onWin={handleWin}
                isMuted={isMuted}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <span className="material-icons-round text-6xl text-slate-700">person_add</span>
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase text-white">Crie sua Conta</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Cadastre-se agora para começar a ganhar prêmios reais!</p>
                </div>
                <button
                  onClick={() => setActiveView('auth')}
                  className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Criar Conta Agora
                </button>
              </div>
            )
          )}

          {activeView === 'bets' && (
            userId ? (
              <Bets userId={userId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <span className="material-icons-round text-6xl text-slate-700">history</span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Crie sua conta para ver seu histórico</p>
                <button onClick={() => setActiveView('auth')} className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase text-xs transition-all active:scale-95">Criar Conta</button>
              </div>
            )
          )}

          {activeView === 'profile' && (
            userId ? (
              <Profile
                balance={balance}
                bankIban={bankIban}
                bankExpress={bankExpress}
                onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
                onUpdateBankDetails={async (iban, express) => {
                  if (!userId) return;
                  const updates: any = {};
                  if (iban) updates.bank_iban = iban;
                  if (express) updates.bank_express = express;

                  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
                  if (!error) {
                    if (iban) setBankIban(iban);
                    if (express) setBankExpress(express);
                    alert('Dados bancários salvos com sucesso!');
                  }
                }}
              />
            ) : (
              <Auth onAuthSuccess={() => setActiveView('profile')} />
            )
          )}

          {activeView === 'verify' && (
            <VerificationGuide onBack={() => handleNavigate('home')} />
          )}
        </Layout>
      )}

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDeposit={handleDeposit}
      />

      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        balance={balance}
        onWithdraw={handleWithdraw}
        onVerify={() => setActiveView('verify')}
        isVerified={isVerified}
        bankIban={bankIban}
        bankExpress={bankExpress}
      />
    </div>
  );
};

export default App;
