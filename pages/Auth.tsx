
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthProps {
    onAuthSuccess: () => void;
    title?: string;
    subtitle?: string;
    disableRegister?: boolean;
    initialIsLogin?: boolean;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess, title, subtitle, disableRegister = false, initialIsLogin = false }) => {
    const [isLogin, setIsLogin] = useState(initialIsLogin);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (loginError) {
                    if (loginError.message === 'Invalid login credentials') {
                        throw new Error('Credenciais incorretas.');
                    }
                    throw loginError;
                }
            } else {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                });

                if (signUpError) {
                    if (signUpError.message.includes('User already registered')) {
                        throw new Error('Este e-mail já está cadastrado. Tente fazer login!');
                    }
                    throw signUpError;
                }

                // Profile creation
                if (signUpData.user) {
                    const userId = signUpData.user.id;
                    try {
                        // Use upsert but don't force balance to 0 if it already exists (e.g. from a previous failed attempt)
                        // The database default for balance is already 0.00
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .upsert({
                                id: userId,
                                name: name,
                                email: email,
                            }, { onConflict: 'id' });

                        if (profileError) {
                            console.error('Profile creation error:', profileError);
                        } else {
                            console.log('Profile created/synced successfully');
                        }
                    } catch (e) {
                        console.error('Async profile creation failed:', e);
                    }
                }
            }
            // Add a small delay for Supabase session to propagate
            setTimeout(() => {
                onAuthSuccess();
            }, 100);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-2">
                <div className="mx-auto mb-4 flex items-center justify-center">
                    <img src="/logo.png" alt="KZ Games Logo" className="h-40 w-auto object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                    {title || (isLogin ? 'Bem-vindo de volta' : 'Criar Conta')}
                </h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {subtitle || (isLogin ? 'Acesse sua conta para continuar jogando' : 'Cadastre-se para começar sua sorte')}
                </p>
            </div>

            <div className="w-full max-w-sm bg-card-dark rounded-[32px] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent absolute top-0 left-0"></div>

                <form onSubmit={handleAuth} className="space-y-5">
                    {!isLogin && !disableRegister && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                            <div className="relative">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">person</span>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                    placeholder="Seu nome"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                        <div className="relative">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">alternate_email</span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                placeholder="exemplo@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                        <div className="relative">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">lock</span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl flex items-center gap-2">
                            <span className="material-icons-round text-sm">error</span>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <span className="material-icons-round text-xl">{isLogin ? 'login' : 'how_to_reg'}</span>
                                <span className="uppercase tracking-widest">{isLogin ? 'Entrar' : 'Cadastrar'}</span>
                            </>
                        )}
                    </button>
                </form>

                {!disableRegister && (
                    <div className="mt-8 text-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                            {isLogin ? 'Não tem uma conta?' : 'Já possui uma conta?'}
                        </p>
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary text-xs font-black uppercase tracking-tighter hover:text-white transition-colors underline decoration-primary/30 underline-offset-4"
                        >
                            {isLogin ? 'Criar nova conta agora' : 'Fazer login na minha conta'}
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1 opacity-40">
                <span className="material-icons-round text-[10px] text-slate-500">verified_user</span>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                    Acesso Seguro • Encriptação SSL
                </p>
            </div>
        </div>
    );
};

export default Auth;
