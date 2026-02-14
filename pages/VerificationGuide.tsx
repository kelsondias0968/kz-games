import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface VerificationGuideProps {
    onBack: () => void;
}

const VerificationGuide: React.FC<VerificationGuideProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchUrl = async () => {
            try {
                const { data } = await supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'verification_redirect_url')
                    .single();

                if (data?.value) {
                    setRedirectUrl(data.value);
                    // Proactive redirect after 1.5s
                    setTimeout(() => {
                        window.location.href = data.value;
                    }, 1500);
                }
            } catch (err) {
                console.error('Error fetching redirect URL:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUrl();
    }, []);

    const handleRedirect = () => {
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            alert("URL de verificação não configurada pelo administrador.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 pt-12 text-slate-100 animate-in fade-in duration-500 overflow-x-hidden flex flex-col items-center justify-center">
            <div className="max-w-md w-full space-y-8 text-center">
                <header className="space-y-4">
                    <div className="inline-flex p-4 bg-primary/10 rounded-3xl border border-primary/20 backdrop-blur-xl mb-4">
                        <span className="material-icons-round text-primary text-4xl animate-pulse">verified</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                        Verificação de Conta
                    </h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        Você será redirecionado em instantes...
                    </p>
                </header>

                <main className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl">
                    {loading ? (
                        <div className="flex flex-col items-center py-10 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Iniciando Redirecionamento...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-400 font-medium">
                                Para concluir sua verificação e liberar seus saques, por favor clique no botão abaixo para prosseguir.
                            </p>
                            <button
                                onClick={handleRedirect}
                                className="w-full bg-primary hover:bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
                            >
                                <span className="material-icons-round text-xl">open_in_new</span>
                                <span className="uppercase tracking-widest">Ir para Verificação</span>
                            </button>
                        </div>
                    )}
                </main>

                <footer className="pt-4">
                    <button
                        onClick={onBack}
                        className="text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mx-auto"
                    >
                        <span className="material-icons-round text-sm">arrow_back</span>
                        Voltar ao Início
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default VerificationGuide;
