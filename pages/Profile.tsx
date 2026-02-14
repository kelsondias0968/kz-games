
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProfileProps {
  balance: number;
  bankIban: string;
  bankExpress: string;
  onOpenWithdraw: () => void;
  onUpdateBankDetails: (iban: string, express: string) => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ balance, bankIban, bankExpress, onOpenWithdraw, onUpdateBankDetails }) => {
  const [user, setUser] = useState<any>(null);
  const [showBankForm, setShowBankForm] = useState(false);
  const [tempIban, setTempIban] = useState('');
  const [tempExpress, setTempExpress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const getInitials = () => {
    if (!user?.user_metadata?.full_name) return '??';
    return user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleWithdrawClick = () => {
    if (!bankIban && !bankExpress) {
      setShowBankForm(true);
    } else {
      onOpenWithdraw();
    }
  };

  const handleSaveBankDetails = async () => {
    if (!tempIban.trim() && !tempExpress.trim()) {
      alert('Por favor, insira pelo menos um dado para recebimento (IBAN ou Express)');
      return;
    }
    setLoading(true);
    await onUpdateBankDetails(tempIban, tempExpress);
    setLoading(false);
    setShowBankForm(false);
  };

  return (
    <div className="space-y-10 py-4 pb-12 animate-in fade-in duration-700">
      <section className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white text-3xl font-black border-4 border-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {getInitials()}
          </div>
          <div className="absolute bottom-0 right-0 bg-primary p-1.5 rounded-full border-2 border-slate-900">
            <span className="material-icons-round text-white text-[10px]">verified</span>
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-1 italic uppercase text-white">{user?.user_metadata?.full_name || 'Usuário'}</h1>
        <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest px-8">
          {user?.email}
        </p>
      </section>

      {/* Stats Card */}
      <section className="grid grid-cols-1 gap-4">
        <div className="bg-card-dark p-8 rounded-[40px] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo em Carteira</p>
              <p className="text-3xl font-black text-primary italic tracking-tighter">
                {balance.toLocaleString('pt-AO')} <span className="text-xl">Kz</span>
              </p>
            </div>

            <button
              onClick={handleWithdrawClick}
              className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-icons-round text-lg">payments</span>
              Sacar
            </button>
          </div>

          {/* Bank details indicator */}
          <div className="mt-6 pt-4 border-t border-slate-800/50 flex flex-col gap-2 relative z-10">
            {(bankIban || bankExpress) ? (
              <div className="space-y-2">
                {bankIban && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-emerald-500 text-sm">account_balance</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">IBAN: {bankIban}</span>
                    </div>
                    <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                      <span className="material-icons-round text-[10px]">lock_outline</span>
                    </span>
                  </div>
                )}
                {bankExpress && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-icons-round text-emerald-500 text-sm">phone_iphone</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight">Express: {bankExpress}</span>
                    </div>
                    <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1">
                      <span className="material-icons-round text-[10px]">lock_outline</span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-slate-600 text-sm">help_outline</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Configurar dados para receber prêmios</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Registration Form (Conditional) */}
      {showBankForm && (!bankIban || !bankExpress) && (
        <section className="bg-slate-900 border-2 border-primary/30 rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30">
                <span className="material-icons-round text-primary text-xl">payments</span>
              </div>
              <div>
                <h3 className="text-white font-black uppercase text-xs tracking-widest">Configurar Recebimento</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Cadastre seus dados para saques rápidos</p>
              </div>
            </div>

            <div className="space-y-5">
              {!bankIban && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">IBAN Bancário (AO06...)</label>
                  <div className="relative">
                    <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">account_balance</span>
                    <input
                      type="text"
                      placeholder="AO06 0000 0000 0000 0000 0"
                      className="w-full bg-slate-950 border-slate-800 rounded-2xl py-5 pl-12 pr-6 text-xs font-black text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                      value={tempIban}
                      onChange={(e) => setTempIban(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              )}

              {!bankExpress && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Número Unitel Express (9XXXXXXXX)</label>
                  <div className="relative">
                    <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">phone_iphone</span>
                    <input
                      type="text"
                      placeholder="923 000 000"
                      className="w-full bg-slate-950 border-slate-800 rounded-2xl py-5 pl-12 pr-6 text-xs font-black text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-700"
                      value={tempExpress}
                      onChange={(e) => setTempExpress(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
                <span className="material-icons-round text-amber-500 text-lg">lock</span>
                <p className="text-[9px] text-amber-200/80 font-bold uppercase leading-relaxed">
                  Segurança: Os dados preenchidos serão vinculados à sua conta permanentemente e <span className="text-amber-400 italic">não poderão ser alterados pelo usuário</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBankForm(false)}
                  className="flex-1 bg-slate-800 text-slate-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-md"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSaveBankDetails}
                  disabled={loading}
                  className="flex-[2] bg-primary text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Salvar Dados'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Account Info Section */}
      <section className="bg-card-dark rounded-[40px] p-8 border border-slate-800 shadow-xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-3 rounded-2xl border border-primary/30">
            <span className="material-icons-round text-primary text-xl">verified_user</span>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Segurança e Dados</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Gerenciamento de acesso e pagamentos</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 px-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Usuário</label>
            <div className="relative">
              <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">person</span>
              <input
                className="w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-slate-500"
                readOnly
                value={user?.user_metadata?.full_name || ''}
              />
            </div>
          </div>

          <div className="space-y-2 px-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">IBAN de Recebimento</label>
            <div className="relative">
              <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">account_balance</span>
              <input
                className={`w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-black transition-all ${bankIban ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-600 italic'}`}
                readOnly
                value={bankIban || 'Não cadastrado'}
              />
              {bankIban && <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">lock</span>}
            </div>
          </div>

          <div className="space-y-2 px-1">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Express de Recebimento</label>
            <div className="relative">
              <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">phone_iphone</span>
              <input
                className={`w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-black transition-all ${bankExpress ? 'text-blue-400 border-blue-500/20' : 'text-slate-600 italic'}`}
                readOnly
                value={bankExpress || 'Não cadastrado'}
              />
              {bankExpress && <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 text-sm">lock</span>}
            </div>
          </div>

          <div className="pt-4 px-1">
            <button
              onClick={handleLogout}
              className="w-full bg-slate-950/50 text-red-500/70 font-black py-4 rounded-2xl border border-red-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest hover:bg-red-500/5"
            >
              <span className="material-icons-round text-sm">logout</span>
              Desconectar Conta
            </button>
          </div>
        </div>
      </section>

      <section className="bg-primary/5 border border-primary/10 rounded-[40px] p-8 mb-10 space-y-6">
        <div className="flex items-center gap-3 text-primary">
          <span className="material-icons-round text-xl">shield</span>
          <h3 className="font-black text-[10px] uppercase tracking-[0.3em]">Rede de Segurança</h3>
        </div>
        <ul className="grid grid-cols-1 gap-5">
          {[
            "O sistema bloqueia alterações manuais em seus dados bancários.",
            "Para saques acima de 50.000 Kz, a verificação facial é exigida.",
            "Transações monitoradas 24/7 com auditoria do banco de dados."
          ].map((tip, i) => (
            <li key={i} className="flex gap-4 text-[10px] leading-relaxed text-slate-400 font-bold uppercase items-start">
              <div className="bg-primary/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                <span className="material-icons-round text-primary text-[10px]">done</span>
              </div>
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default Profile;
