import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Bet {
  id: string;
  game_name: string;
  created_at: string;
  cost: number;
  is_winner: boolean;
  win_amount: number;
  type?: 'bet';
}

interface UserDeposit {
  id: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'FAILED';
  created_at: string;
  type?: 'deposit';
}

interface BetsProps {
  userId: string | null;
}

const Bets: React.FC<BetsProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'bets' | 'deposits'>('bets');
  const [bets, setBets] = useState<Bet[]>([]);
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      if (activeTab === 'bets') {
        const { data, error } = await supabase
          .from('bets')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data && !error) {
          setBets(data.map(b => ({ ...b, type: 'bet' })));
        }
      } else {
        const { data, error } = await supabase
          .from('deposits')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (data && !error) {
          setDeposits(data.map(d => ({ ...d, type: 'deposit' })));
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [userId, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl">
            <span className="material-icons-round text-primary text-xl">history</span>
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Histórico</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Suas transações e jogadas</p>
          </div>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl relative z-10">
        <button
          onClick={() => setActiveTab('bets')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'bets' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Minhas Apostas
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'deposits' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Depósitos
        </button>
      </div>

      {activeTab === 'bets' ? (
        bets.length > 0 ? (
          <div className="space-y-3">
            {bets.map(bet => (
              <div key={bet.id} className="bg-card-dark p-5 rounded-[24px] border border-slate-800 shadow-xl flex justify-between items-center relative overflow-hidden group transition-all hover:border-slate-700">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Jogo</span>
                  <h3 className="text-sm font-black uppercase text-white tracking-tight">{bet.game_name}</h3>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">
                    {new Date(bet.created_at).toLocaleString('pt-AO')}
                  </p>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resultado</p>
                  <p className={`text-base font-black uppercase tracking-tighter ${bet.is_winner ? 'text-primary' : 'text-slate-600'}`}>
                    {bet.is_winner ? `+${bet.win_amount.toLocaleString('pt-AO')} Kz` : `-${bet.cost.toLocaleString('pt-AO')} Kz`}
                  </p>
                  <div className={`mt-1 inline-flex self-end px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${bet.is_winner ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                    {bet.is_winner ? 'Ganhou' : 'Não premiado'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Suas jogadas aparecerão aqui assim que começar a raspar!" />
        )
      ) : (
        deposits.length > 0 ? (
          <div className="space-y-3">
            {deposits.map(dep => (
              <div key={dep.id} className="bg-card-dark p-5 rounded-[24px] border border-slate-800 shadow-xl flex justify-between items-center relative overflow-hidden group transition-all hover:border-slate-700">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-primary">Depósito</span>
                  <h3 className="text-sm font-black uppercase text-white tracking-tight">Recarga de Saldo</h3>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">
                    {new Date(dep.created_at).toLocaleString('pt-AO')}
                  </p>
                </div>
                <div className="text-right flex flex-col gap-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor</p>
                  <p className="text-base font-black uppercase tracking-tighter text-white">
                    {dep.amount.toLocaleString('pt-AO')} Kz
                  </p>
                  <div className={`mt-1 inline-flex self-end px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${dep.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : dep.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {dep.status === 'PAID' ? 'Pago' : dep.status === 'PENDING' ? 'Aguardando' : 'Falhou'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Você ainda não fez nenhum depósito." />
        )
      )}
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-card-dark/50 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center py-20 text-center space-y-4">
    <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800 shadow-inner">
      <span className="material-icons-round text-4xl text-slate-700">history_toggle_off</span>
    </div>
    <div className="space-y-1">
      <p className="text-sm font-black uppercase text-white tracking-tight">Nada por aqui ainda</p>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest max-w-[200px]">{message}</p>
    </div>
  </div>
);

export default Bets;
