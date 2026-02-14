
import React, { useState, useEffect } from 'react';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    onWithdraw: (amount: number, details: string) => void;
    onVerify: () => void;
    isVerified?: boolean;
    bankIban?: string;
    bankExpress?: string;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
    isOpen,
    onClose,
    balance,
    onWithdraw,
    onVerify,
    isVerified = false,
    bankIban = '',
    bankExpress = ''
}) => {
    const [amount, setAmount] = useState<number>(50000);
    const [method, setMethod] = useState<'iban' | 'express'>('express');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMinWarning, setShowMinWarning] = useState(false);

    // Update details whenever method or bank props change
    useEffect(() => {
        if (method === 'iban') {
            setDetails(bankIban);
        } else {
            setDetails(bankExpress);
        }
    }, [method, bankIban, bankExpress, isOpen]);

    if (!isOpen) return null;

    const handleWithdraw = () => {
        if (balance < 50000) return;
        if (amount < 50000) {
            setShowMinWarning(true);
            return;
        }
        if (amount > balance) {
            alert("Saldo insuficiente");
            return;
        }
        if (!details) {
            alert("Por favor, preencha os detalhes do pagamento");
            return;
        }

        setLoading(true);
        setTimeout(() => {
            onWithdraw(amount, `${method.toUpperCase()}: ${details}`);
            setLoading(false);
            setShowMinWarning(false);
            onClose();
        }, 1500);
    };

    const isLocked = (method === 'iban' && !!bankIban) || (method === 'express' && !!bankExpress);

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative w-full max-w-md bg-card-dark rounded-[40px] border border-slate-800 shadow-2xl p-8 space-y-8 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-500 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>

                <div className="text-center space-y-2">
                    <div className="bg-primary/20 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/30 glow-primary">
                        <span className="material-icons-round text-primary text-3xl">account_balance_wallet</span>
                    </div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Solicitar Saque</h3>
                </div>

                {balance < 50000 ? (
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center space-y-3">
                        <span className="material-icons-round text-red-500 text-4xl">warning</span>
                        <p className="text-xs font-black text-white uppercase">Saldo Insuficiente</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                            Você precisa de pelo menos 50.000 Kz para realizar um saque.
                            Seu saldo atual: {balance.toLocaleString('pt-AO')} Kz
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest mt-4"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor do Saque (Kz)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(Number(e.target.value));
                                    setShowMinWarning(false);
                                }}
                                min={50000}
                                max={balance}
                                className="w-full bg-slate-950 border-slate-800 rounded-2xl py-4 px-6 text-lg font-black text-primary focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                            {showMinWarning && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-2 animate-in slide-in-from-top-2">
                                    <span className="material-icons-round text-red-500 text-sm">error</span>
                                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wide leading-relaxed">
                                        O valor mínimo para saque é de 50.000 Kz
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Método de Recebimento</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMethod('express')}
                                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${method === 'express' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                >
                                    Número Express
                                </button>
                                <button
                                    onClick={() => setMethod('iban')}
                                    className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${method === 'iban' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                                >
                                    IBAN Bancário
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                {method === 'express' ? 'Número de Telefone' : 'Número do IBAN'}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    readOnly={isLocked}
                                    placeholder={method === 'express' ? '9XXXXXXXX' : 'AO06...'}
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    className={`w-full bg-slate-950 border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/50 outline-none transition-all ${isLocked ? 'text-emerald-400 border-emerald-500/20' : 'text-white'}`}
                                />
                                {isLocked && (
                                    <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">lock</span>
                                )}
                            </div>

                            {!isVerified && balance >= 50000 && details.length > 5 && (
                                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons-round text-amber-500 text-lg">report_problem</span>
                                        <div className="flex flex-col text-left">
                                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Conta não verificada</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onVerify();
                                            onClose();
                                        }}
                                        className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                                    >
                                        Verificar
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={(!isVerified && balance >= 50000) ? (e) => { e.preventDefault(); onVerify(); onClose(); } : handleWithdraw}
                            disabled={loading || !details}
                            className={`w-full font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${(!isVerified && balance >= 50000) ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-primary hover:bg-blue-600 text-white shadow-primary/30'}`}
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <span className="material-icons-round text-lg">{(!isVerified && balance >= 50000) ? 'verified_user' : 'check_circle'}</span>
                                    {(!isVerified && balance >= 50000) ? 'Verificar Conta para Sacar' : 'Confirmar Saque'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full text-slate-600 text-[10px] font-black uppercase tracking-widest pt-2 hover:text-slate-400 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default WithdrawalModal;
