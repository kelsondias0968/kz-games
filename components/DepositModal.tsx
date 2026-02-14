import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MIN_DEPOSIT } from '../constants';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit?: (amount: number) => void;
}

interface PaymentDetails {
  id?: string;
  entity: string;
  reference: string;
  amount: number;
  externalId: string;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sistema de Escuta em Tempo Real (Realtime) + Polling de Backup
  useEffect(() => {
    if (!paymentDetails?.externalId || isSuccess) return;

    let pollInterval: any;

    const checkStatus = async () => {
      console.log("Verificando status (polling):", paymentDetails.externalId);
      const { data, error } = await supabase
        .from('deposits')
        .select('status')
        .eq('external_id', paymentDetails.externalId)
        .single();

      if (data?.status === 'PAID') {
        setIsSuccess(true);
        clearInterval(pollInterval);
        try {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3').play();
        } catch (e) { }
      }
    };

    // 1. Iniciar Realtime
    const channel = supabase
      .channel(`deposit_${paymentDetails.externalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deposits',
          filter: `external_id=eq.${paymentDetails.externalId}`
        },
        (payload) => {
          console.log("Realtime detectou mudança!", payload);
          if (payload.new.status === 'PAID') {
            setIsSuccess(true);
            clearInterval(pollInterval);
            try {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3').play();
            } catch (e) { }
          }
        }
      )
      .subscribe();

    // 2. Backup: Polling a cada 10 segundos (caso o Realtime falhe)
    pollInterval = setInterval(checkStatus, 10000);

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [paymentDetails?.externalId, isSuccess]);

  if (!isOpen) return null;

  const handleCreateDeposit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < MIN_DEPOSIT) {
      setError(`O depósito mínimo é de ${MIN_DEPOSIT.toLocaleString('pt-AO')} Kz`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-deposit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: numAmount })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || `Erro de conexão: ${response.status}`);
      }

      setPaymentDetails({
        entity: data.entity,
        reference: data.reference,
        amount: numAmount,
        externalId: data.externalId
      });

    } catch (err: any) {
      console.error("Deposit Error:", err);
      setError(err.message || "Falha ao criar depósito. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    const el = document.getElementById(id);
    if (el) {
      el.innerText = 'check';
      el.classList.add('text-emerald-500');
      setTimeout(() => {
        el.innerText = 'content_copy';
        el.classList.remove('text-emerald-500');
      }, 2000);
    }
  };

  const handleClose = () => {
    setPaymentDetails(null);
    setAmount('');
    setError(null);
    setIsSuccess(false);
    onClose();
    // Forçar atualização do saldo na página principal se houve sucesso
    if (isSuccess) {
      window.location.reload();
    }
  }

  const quickValues = [3500, 5000, 10000, 20000];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose}></div>

      <div className="relative w-full max-w-sm bg-card-dark rounded-[32px] border border-slate-800 p-6 flex flex-col gap-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">

        {isSuccess ? (
          <div className="text-center py-8 space-y-6 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <span className="material-icons-round text-white text-5xl">check</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sucesso!</h2>
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Depósito Confirmado</p>
              <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">
                O valor de <span className="text-white font-bold">{paymentDetails?.amount.toLocaleString('pt-AO')} Kz</span> já está disponível na sua conta.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/20"
            >
              Continuar a Jogar
            </button>
          </div>
        ) : !paymentDetails ? (
          <>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/30 glow-primary">
                <span className="material-icons-round text-primary text-3xl">account_balance_wallet</span>
              </div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Depósito</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Carregamento via Multicaixa / Express</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor do Depósito</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-primary font-black">Kz</span>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setError(null);
                    }}
                    className="block w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl text-white font-bold text-lg transition-all outline-none"
                    placeholder="0,00"
                  />
                  {amount === '5000' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-emerald-500 text-[8px] font-black text-white px-2 py-1 rounded-lg animate-bounce">
                      <span className="material-icons-round text-[10px]">stars</span>
                      +3.500 KZ BÓNUS
                    </div>
                  )}
                </div>
                {error && <p className="text-red-500 text-[10px] font-bold mt-1 px-1">{error}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {quickValues.map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      setAmount(val.toString());
                      setError(null);
                    }}
                    className={`relative py-3 px-4 rounded-xl border font-black text-xs transition-all uppercase ${amount === val.toString() ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                  >
                    {val.toLocaleString('pt-AO')} Kz
                    {val === 5000 && (
                      <span className="absolute -top-2 -right-1 bg-emerald-500 text-[7px] text-white px-1.5 py-0.5 rounded-full border border-slate-900">
                        BÓNUS
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCreateDeposit}
                disabled={loading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span className="material-icons-round text-xl">check_circle</span>
                    <span className="uppercase text-xs tracking-widest">Gerar Referência</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                className="w-full text-slate-500 text-[10px] font-bold hover:text-slate-300 transition-colors uppercase tracking-tight"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in zoom-in duration-300">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30 animate-pulse">
                <span className="material-icons-round text-emerald-500 text-3xl">receipt_long</span>
              </div>
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Pagamento Gerado</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest max-w-[200px] mx-auto">
                Utilize os dados abaixo para pagar no Multicaixa ou App Bancário
              </p>
            </div>

            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <div
                className="group flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                onClick={() => handleCopy(paymentDetails.entity, 'copy-ent')}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Entidade</span>
                  <span className="text-lg font-black text-white tracking-widest">{paymentDetails.entity}</span>
                </div>
                <span id="copy-ent" className="material-icons-round text-slate-500 text-lg group-hover:text-primary">content_copy</span>
              </div>

              <div
                className="group flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                onClick={() => handleCopy(paymentDetails.reference, 'copy-ref')}
              >
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Referência</span>
                  <span className="text-lg font-black text-white tracking-widest">{paymentDetails.reference}</span>
                </div>
                <span id="copy-ref" className="material-icons-round text-slate-500 text-lg group-hover:text-primary">content_copy</span>
              </div>

              <div className="flex justify-between items-center px-2 pt-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor</span>
                <span className="text-xl font-black text-primary">{paymentDetails.amount.toLocaleString('pt-AO')} Kz</span>
              </div>
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex gap-3 items-center">
              <div className="relative">
                <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest leading-none">
                Aguardando Confirmação...
              </p>
            </div>

            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/30 flex gap-3 items-start">
              <span className="material-icons-round text-blue-400 text-lg mt-0.5">info</span>
              <p className="text-[10px] text-blue-200 font-medium leading-relaxed">
                Após o pagamento, seu saldo será atualizado automaticamente. Não feche esta janela se desejar ver a confirmação instantânea.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-colors"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute bottom-0 left-0"></div>
      </div>
    </div>
  );
};

export default DepositModal;
