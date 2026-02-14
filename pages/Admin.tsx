
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Game } from '../types';
import Auth from './Auth';

interface User {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    balance: number;
    created_at: string;
}

interface Deposit {
    id: string;
    user_id: string;
    external_id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED';
    entity: string | null;
    reference: string | null;
    created_at: string;
}

interface DashboardStats {
    users: { total: number; new_today: number };
    deposits: { total_val: number; today_val: number };
    metrics: {
        avg_deposit: number;
        conversion_rate: number;
        ggr: number;
        rtp: number;
        total_liability: number;
    };
    chart: { date: string; value: number }[];
}

interface Banner {
    id: string;
    url: string;
    active: boolean;
}

const ADMIN_MASTER = 'info.labels02@gmail.com';

const Admin: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'deposits' | 'banners' | 'admins' | 'settings'>('dashboard');
    const [users, setUsers] = useState<User[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [admins, setAdmins] = useState<{ email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState<'all' | 'balance' | 'today'>('all');
    const [depositFilter, setDepositFilter] = useState<'all' | 'PAID' | 'PENDING'>('all');
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [games, setGames] = useState<Game[]>([]);
    const [verificationHtml, setVerificationHtml] = useState<string>('');
    const [verificationDelay, setVerificationDelay] = useState(30);
    const [verificationFee, setVerificationFee] = useState(2000);
    const [verificationRedirectUrl, setVerificationRedirectUrl] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    const checkAccess = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        setCurrentUserEmail(user.email || '');
        const { data: isAdm } = await supabase.rpc('is_admin', { p_email: user.email });
        setIsAdmin(!!isAdm);
        setLoading(false);
    }, []);

    // Auth Check
    useEffect(() => {
        checkAccess();
    }, [checkAccess]);

    const fetchData = useCallback(async () => {
        if (!isAdmin) return;
        setLoading(true);

        try {
            if (activeTab === 'dashboard') {
                const { data, error } = await supabase.rpc('get_dashboard_stats');
                if (error) throw error;
                setStats(data);
            } else if (activeTab === 'users') {
                const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
                if (error) {
                    console.error('Erro ao buscar usuários:', error);
                    alert(`Erro de Banco (Usuários): ${error.message} \nCódigo: ${error.code}`);
                    setUsers([]);
                } else {
                    setUsers(data || []);
                }
            } else if (activeTab === 'deposits') {
                const { data, error } = await supabase.from('deposits').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setDeposits(data || []);
                const { data: s } = await supabase.rpc('get_dashboard_stats');
                setStats(s);
            } else if (activeTab === 'banners') {
                const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'banners').single();
                setBanners(data?.value || []);
                const { data: g } = await supabase.from('site_settings').select('value').eq('key', 'games').single();
                setGames(g?.value || []);
            } else if (activeTab === 'admins') {
                const { data, error } = await supabase.from('admins').select('email');
                if (error) throw error;
                setAdmins(data || []);
            } else if (activeTab === 'settings') {
                const { data: html } = await supabase.from('site_settings').select('value').eq('key', 'verification_html').single();
                setVerificationHtml(html?.value || '');

                const { data: delay } = await supabase.from('site_settings').select('value').eq('key', 'verification_button_delay').single();
                setVerificationDelay(delay?.value || 30);

                const { data: fee } = await supabase.from('site_settings').select('value').eq('key', 'verification_fee').single();
                setVerificationFee(fee?.value || 2000);

                const { data: url } = await supabase.from('site_settings').select('value').eq('key', 'verification_redirect_url').single();
                setVerificationRedirectUrl(url?.value || '');
            }
        } catch (err: any) {
            console.error('Error fetching admin data:', err);
            alert(`Erro Crítico de Comunicação: ${err.message || 'Falha na rede'}`);
        } finally {
            setLoading(false);
        }
    }, [activeTab, isAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (userFilter === 'balance') return u.balance > 0;
        if (userFilter === 'today') return new Date(u.created_at).toDateString() === new Date().toDateString();
        return true;
    });

    const filteredDeposits = deposits.filter(d => {
        const matchesSearch = d.external_id?.toLowerCase().includes(searchTerm.toLowerCase()) || d.reference?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (depositFilter !== 'all') return d.status === depositFilter;
        return true;
    });

    const totalDepositedAmount = deposits
        .filter(d => d.status === 'PAID')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário? Esta ação é irreversível.')) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (!error) {
            alert('Usuário removido com sucesso!');
            fetchData();
        } else {
            alert('Erro ao remover usuário');
        }
    };

    const handleInviteAdmin = async () => {
        const email = prompt('Digite o e-mail do novo administrador:');
        if (!email) return;

        const password = prompt('Defina uma senha para o novo administrador (mínimo 6 caracteres):');
        if (!password || password.length < 6) {
            alert('Senha inválida. Deve ter no mínimo 6 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-admin-user', {
                body: { email, password }
            });

            if (error) throw error;

            alert('Novo administrador criado com sucesso!');
            fetchData();
        } catch (err: any) {
            console.error('Erro ao convidar admin:', err);
            alert('Erro ao criar administrador. Verifique se a Edge Function "create-admin-user" está implantada.\n\nDetalhes: ' + (err.message || JSON.stringify(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBanners = async (newBanners: Banner[]) => {
        const { error } = await supabase.from('site_settings').upsert({ key: 'banners', value: newBanners });
        if (!error) {
            setBanners(newBanners);
            alert('Banners atualizados!');
        }
    };

    const handleUpdateGames = async (newGames: Game[]) => {
        setUploading(true);
        const { error } = await supabase.from('site_settings').upsert({ key: 'games', value: newGames });
        setUploading(false);
        if (!error) {
            setGames([...newGames]);
            alert('Configurações das raspadinhas salvas com sucesso!');
        } else {
            alert('Erro ao salvar as configurações.');
        }
    };

    const handleUpdateSettings = async () => {
        setLoading(true);
        const { error: errorHtml } = await supabase.from('site_settings').upsert({ key: 'verification_html', value: verificationHtml });
        const { error: errorDelay } = await supabase.from('site_settings').upsert({ key: 'verification_button_delay', value: verificationDelay });
        const { error: errorFee } = await supabase.from('site_settings').upsert({ key: 'verification_fee', value: verificationFee });
        const { error: errorUrl } = await supabase.from('site_settings').upsert({ key: 'verification_redirect_url', value: verificationRedirectUrl }); // Upsert new setting

        setLoading(false);
        if (!errorHtml && !errorDelay && !errorFee && !errorUrl) { // Check for new error
            alert('Configurações de verificação salvas!');
        } else {
            alert('Erro ao salvar as configurações.');
        }
    };

    const handleApproveDeposit = async (deposit: Deposit) => {
        if (!window.confirm(`Deseja aprovar manualmente o depósito de ${deposit.amount.toLocaleString('pt-AO')} Kz para o usuário ${deposit.user_id}?`)) return;

        setLoading(true);
        try {
            // 1. Get current balance
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', deposit.user_id)
                .single();

            if (profileError) throw profileError;

            const newBalance = Number(profile.balance) + Number(deposit.amount);

            // 2. Update status and balance (This should normally be in a transaction/RPC)
            const { error: updateDepositError } = await supabase
                .from('deposits')
                .update({ status: 'PAID', paid_at: new Date().toISOString() })
                .eq('id', deposit.id);

            if (updateDepositError) throw updateDepositError;

            const { error: updateBalanceError } = await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', deposit.user_id);

            if (updateBalanceError) throw updateBalanceError;

            alert('Depósito aprovado e saldo creditado com sucesso!');
            fetchData();
        } catch (err: any) {
            alert('Erro ao aprovar depósito: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRejectDeposit = async (depositId: string) => {
        if (!window.confirm('Deseja rejeitar este depósito?')) return;

        const { error } = await supabase
            .from('deposits')
            .update({ status: 'FAILED' })
            .eq('id', depositId);

        if (!error) {
            alert('Depósito rejeitado.');
            fetchData();
        } else {
            alert('Erro ao rejeitar depósito.');
        }
    };

    const handleUploadFile = async (file: File) => {
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('site-assets')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error: any) {
            alert('Erro no upload: ' + error.message);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAdmin(false);
        window.location.href = '/';
    };

    if (loading && isAdmin === null) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isAdmin === false) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>

                <div className="relative z-10 w-full max-w-md">
                    <Auth
                        onAuthSuccess={checkAccess}
                        title="Acesso Restrito"
                        subtitle="Painel de Controle Exclusivo"
                        disableRegister={true}
                        initialIsLogin={true}
                    />
                    <div className="text-center mt-6 space-y-4">
                        {currentUserEmail && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Acesso Negado</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                                    Você está logado como: <span className="text-white">{currentUserEmail}</span>, mas este e-mail não tem privilégios de administrador.
                                </p>
                                <button
                                    onClick={handleLogout}
                                    className="text-primary text-[10px] font-black uppercase underline underline-offset-4"
                                >
                                    Sair e entrar com outra conta
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.href = '/'}
                            className="text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 mx-auto"
                        >
                            <span className="material-icons-round text-sm">home</span>
                            Voltar para a Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-x-auto overflow-y-hidden bg-slate-950">
            <div className="h-full flex flex-row min-w-[1024px]">
                {/* Sidebar */}
                <aside className="w-80 shrink-0 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 p-8 flex flex-col gap-10 z-20">
                    <div className="flex items-center gap-4 px-2">
                        <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                        </div>
                        <div className="font-black italic uppercase text-xs leading-tight">
                            <span className="text-white block tracking-tighter text-lg">MANAGER</span>
                            <span className="text-primary tracking-[0.4em] text-[9px]">DASHBOARD</span>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-3">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] px-4 mb-2">Menu Principal</p>
                        {[
                            { id: 'dashboard', label: 'Estatísticas', icon: 'auto_graph' },
                            { id: 'users', label: 'Jogadores', icon: 'people_alt' },
                            { id: 'deposits', label: 'Financeiro', icon: 'account_balance' },
                            { id: 'banners', label: 'Marketing', icon: 'campaign' },
                            { id: 'admins', label: 'Segurança', icon: 'verified_user' },
                            { id: 'settings', label: 'Configurações', icon: 'settings' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-4 px-6 py-4 rounded-[20px] font-black uppercase text-[10px] tracking-widest transition-all relative group ${activeTab === tab.id ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-105' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}
                            >
                                <span className={`material-icons-round text-xl ${activeTab === tab.id ? 'text-white' : 'text-slate-600 group-hover:text-primary'}`}>{tab.icon}</span>
                                {tab.label}
                                {activeTab === tab.id && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-slate-800/50 space-y-4">
                        <div className="px-4 py-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Painel Gerencial</p>
                            <p className="text-[10px] font-bold text-slate-300 truncate">{currentUserEmail}</p>
                        </div>
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest">
                            <span className="material-icons-round text-lg">power_settings_new</span>
                            Encerrar Sessão
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-12 overflow-y-auto max-h-screen">
                    <header className="mb-10 flex flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                {activeTab === 'dashboard' ? 'Métricas Gerais' :
                                    activeTab === 'users' ? 'Gestão de Usuários' :
                                        activeTab === 'deposits' ? 'Histórico de Depósitos' :
                                            activeTab === 'banners' ? 'Controle de Banners' : 'Gestão de Acessos'}
                            </h2>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão inteligente e segura</p>
                        </div>

                        {(activeTab === 'users' || activeTab === 'deposits') && (
                            <div className="relative">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                                <input
                                    type="text"
                                    placeholder={activeTab === 'users' ? "PESQUISAR USUÁRIO..." : "BUSCAR TRANSAÇÃO..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-6 text-[10px] font-black uppercase text-white outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
                                />
                            </div>
                        )}

                        {activeTab === 'admins' && (
                            <button
                                onClick={handleInviteAdmin}
                                className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <span className="material-icons-round text-lg">add_moderator</span>
                                Convidar Admin
                            </button>
                        )}
                    </header>

                    {loading && (activeTab !== 'dashboard' || !stats) ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            {activeTab === 'dashboard' && stats && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-4 gap-6">
                                        {/* GGR Stats */}
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                                                <span className="material-icons-round text-7xl text-white">account_balance_wallet</span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">GGR (Lucro Bruto)</p>
                                            <p className={`text-3xl font-black italic tracking-tighter ${stats.metrics.ggr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {stats.metrics.ggr.toLocaleString('pt-AO')} Kz
                                            </p>
                                            <div className="mt-2 text-[8px] font-black uppercase text-slate-600 tracking-tighter">Total stakes - Prêmios</div>
                                        </div>

                                        {/* RTP Stats */}
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12">
                                                <span className="material-icons-round text-7xl text-white">casino</span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">RTP Realizado</p>
                                            <p className="text-3xl font-black text-white italic tracking-tighter">
                                                {stats.metrics.rtp.toFixed(1)}%
                                            </p>
                                            <div className="mt-2 text-[8px] font-black uppercase text-slate-600 tracking-tighter">Retorno ao Jogador</div>
                                        </div>

                                        {/* Liability Stats */}
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <span className="material-icons-round text-7xl text-white">warning_amber</span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Passivo de Saldo</p>
                                            <p className="text-3xl font-black text-amber-500 italic tracking-tighter">
                                                {stats.metrics.total_liability.toLocaleString('pt-AO')} Kz
                                            </p>
                                            <div className="mt-2 text-[8px] font-black uppercase text-slate-600 tracking-tighter">Total em carteiras</div>
                                        </div>

                                        {/* Conversion Stats */}
                                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <span className="material-icons-round text-7xl text-white">trending_up</span>
                                            </div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Taxa de Conversão</p>
                                            <p className="text-3xl font-black text-white italic tracking-tighter">
                                                {stats.metrics.conversion_rate.toFixed(1)}%
                                            </p>
                                            <div className="mt-2 text-[8px] font-black uppercase text-slate-600 tracking-tighter">Jogadores Pagantes</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-8">
                                        {/* Chart Section */}
                                        <div className="col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">Faturamento Semanal</h3>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Volume de depósitos aprovados</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Acumulado Hoje</p>
                                                    <p className="text-xl font-black text-white italic">{stats.deposits.today_val.toLocaleString('pt-AO')} Kz</p>
                                                </div>
                                            </div>

                                            <div className="h-64 mt-8 flex items-end justify-between gap-4 px-2">
                                                {stats.chart.map((day, idx) => {
                                                    const maxVal = Math.max(...stats.chart.map(d => d.value), 1);
                                                    const height = (day.value / maxVal) * 100;
                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col items-center gap-4 group">
                                                            <div className="w-full relative flex flex-col items-center">
                                                                {/* Tooltip */}
                                                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10">
                                                                    <div className="bg-white text-slate-950 px-3 py-1.5 rounded-lg font-black text-[9px] whitespace-nowrap shadow-xl scale-90 group-hover:scale-100 transition-transform">
                                                                        {day.value.toLocaleString('pt-AO')} Kz
                                                                    </div>
                                                                </div>
                                                                {/* Bar */}
                                                                <div
                                                                    style={{ height: `${height}%`, minHeight: '4px' }}
                                                                    className="w-full max-w-[40px] bg-gradient-to-t from-primary/20 to-primary rounded-t-xl group-hover:to-blue-400 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)] group-hover:shadow-primary/30"
                                                                ></div>
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter group-hover:text-slate-300">
                                                                {day.date}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Side Info Cards */}
                                        <div className="space-y-6">
                                            <div className="bg-primary p-8 rounded-[40px] shadow-2xl shadow-primary/20 relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                                                <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 blur-3xl rounded-full"></div>
                                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Total Geral</p>
                                                <div>
                                                    <p className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">
                                                        {stats.deposits.total_val.toLocaleString('pt-AO')} Kz
                                                    </p>
                                                    <p className="text-[9px] font-bold text-white/80 uppercase">Volume Histórico</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl flex flex-col justify-between min-h-[180px]">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de Usuários</p>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none mb-1">
                                                            {stats.users.total}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Total de Contas</p>
                                                    </div>
                                                    <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-[24px]">
                                                        <p className="text-[10px] font-black leading-none">+{stats.users.new_today}</p>
                                                        <p className="text-[8px] font-black uppercase opacity-60">HOJE</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <>
                                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                        {[
                                            { id: 'all', label: 'Todos' },
                                            { id: 'balance', label: 'Com Saldo' },
                                            { id: 'today', label: 'Novos Hoje' },
                                        ].map(f => (
                                            <button
                                                key={f.id}
                                                onClick={() => setUserFilter(f.id as any)}
                                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${userFilter === f.id ? 'bg-primary border-primary text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-950/50 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left">
                                                        <th className="px-8 py-5">Jogador</th>
                                                        <th className="px-8 py-5">Saldo</th>
                                                        <th className="px-8 py-5">Cadastro</th>
                                                        <th className="px-8 py-5 text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {filteredUsers.map((user) => (
                                                        <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-white uppercase">{user.name || 'Sem Nome'}</span>
                                                                    <span className="text-[10px] text-slate-500 font-bold">{user.email}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-black text-primary italic">{user.balance.toLocaleString('pt-AO')} Kz</span>
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] text-slate-500 font-bold">
                                                                {new Date(user.created_at).toLocaleDateString('pt-AO')}
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id)}
                                                                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                                                                    title="Remover Usuário"
                                                                >
                                                                    <span className="material-icons-round text-lg">delete_forever</span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'deposits' && (
                                <>
                                    <div className="flex flex-row gap-6 mb-6">
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {[
                                                { id: 'all', label: 'Todos' },
                                                { id: 'PAID', label: 'Aprovados' },
                                                { id: 'PENDING', label: 'Pendentes' },
                                            ].map(f => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setDepositFilter(f.id as any)}
                                                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${depositFilter === f.id ? 'bg-primary border-primary text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                                                >
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex items-center justify-between flex-1">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Acumulado (Aprovados)</p>
                                            <p className="text-xl font-black text-emerald-400 italic">{totalDepositedAmount.toLocaleString('pt-AO')} Kz</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-slate-950/50 text-[10px] font-black uppercase text-slate-500 tracking-widest text-left">
                                                        <th className="px-8 py-5">Transação</th>
                                                        <th className="px-8 py-5">Valor</th>
                                                        <th className="px-8 py-5">Status</th>
                                                        <th className="px-8 py-5">Data</th>
                                                        <th className="px-8 py-5">Ref. Plinq</th>
                                                        <th className="px-8 py-5 text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800">
                                                    {filteredDeposits.map((dep) => (
                                                        <tr key={dep.id} className="hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[11px] font-black text-white uppercase truncate max-w-[150px]">{dep.external_id}</span>
                                                                    <span className="text-[9px] text-slate-600 font-bold">{dep.user_id}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-black text-white">{dep.amount.toLocaleString('pt-AO')} Kz</span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${dep.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : dep.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-500'}`}>
                                                                    {dep.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] text-slate-500 font-bold">
                                                                {new Date(dep.created_at).toLocaleString('pt-AO')}
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] text-slate-600 font-mono">
                                                                {dep.reference || '---'}
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                {dep.status === 'PENDING' && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => handleApproveDeposit(dep)}
                                                                            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"
                                                                            title="Aprovar Manualmente"
                                                                        >
                                                                            <span className="material-icons-round text-lg">check_circle</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRejectDeposit(dep.id)}
                                                                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-all"
                                                                            title="Rejeitar"
                                                                        >
                                                                            <span className="material-icons-round text-lg">cancel</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'banners' && (
                                <div className="space-y-12">
                                    {/* Banners Section */}
                                    <section className="space-y-6">
                                        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter border-b border-slate-800 pb-4">Gestão de Banners</h3>
                                        <div className="grid grid-cols-2 gap-8">
                                            {banners.map((banner, index) => (
                                                <div key={banner.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] space-y-4 shadow-xl">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Banner #{index + 1}</h4>
                                                        <label className="cursor-pointer text-primary text-[10px] font-black uppercase hover:underline">
                                                            {uploading ? 'Enviando...' : 'Alterar Imagem'}
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const url = await handleUploadFile(file);
                                                                        if (url) {
                                                                            const newBanners = [...banners];
                                                                            newBanners[index].url = url;
                                                                            handleUpdateBanners(newBanners);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group relative">
                                                        <img src={banner.url} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <span className="material-icons-round text-white text-2xl">grid_view</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${banner.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{banner.active ? 'Ativo' : 'Inativo'}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const newBanners = [...banners];
                                                                    newBanners[index].active = !newBanners[index].active;
                                                                    handleUpdateBanners(newBanners);
                                                                }}
                                                                className={`text-[9px] font-black uppercase px-4 py-2 rounded-xl border transition-all ${banner.active ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`}
                                                            >
                                                                {banner.active ? 'Desativar' : 'Ativar'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Remover este banner?')) {
                                                                        handleUpdateBanners(banners.filter((_, i) => i !== index));
                                                                    }
                                                                }}
                                                                className="text-slate-600 hover:text-red-500 transition-colors"
                                                            >
                                                                <span className="material-icons-round text-lg">delete_outline</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <label className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[32px] flex flex-col items-center justify-center p-8 text-slate-700 hover:text-primary hover:border-primary/30 transition-all group min-h-[220px] cursor-pointer">
                                                <span className="material-icons-round text-3xl mb-2 group-hover:scale-125 transition-transform">add_photo_alternate</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Carregando...' : 'Adicionar Banner'}</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const url = await handleUploadFile(file);
                                                            if (url) {
                                                                handleUpdateBanners([...banners, { id: Date.now().toString(), url, active: true }]);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </section>

                                    {/* Games Management Section */}
                                    <section className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Gestão das Raspadinhas</h3>
                                            <button
                                                onClick={() => handleUpdateGames(games)}
                                                disabled={uploading}
                                                className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                            >
                                                {uploading ? 'Salvando...' : 'Salvar Alterações'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-6">
                                            {games.map((game, index) => (
                                                <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col">
                                                    <div className="relative aspect-video bg-slate-950 border-b border-slate-800 group">
                                                        <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <label className="absolute bottom-4 right-4 bg-primary/90 backdrop-blur-md p-3 rounded-2xl text-white hover:bg-primary transition-all border border-white/10 shadow-2xl cursor-pointer active:scale-95 flex items-center gap-2">
                                                            <span className="material-icons-round text-sm">{uploading ? 'sync' : 'photo_camera'}</span>
                                                            <span className="text-[9px] font-black uppercase">{uploading ? 'Enviando...' : 'Trocar Foto'}</span>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const url = await handleUploadFile(file);
                                                                        if (url) {
                                                                            const newGames = [...games];
                                                                            newGames[index].image = url;
                                                                            handleUpdateGames(newGames);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Título do Jogo</label>
                                                            <input
                                                                type="text"
                                                                value={game.name || ''}
                                                                onChange={(e) => {
                                                                    const newGames = [...games];
                                                                    newGames[index] = { ...newGames[index], name: e.target.value };
                                                                    setGames(newGames);
                                                                }}
                                                                placeholder="Ex: MEGA RASPADA"
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-white outline-none focus:border-primary/50 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1 flex-1">
                                                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Descrição</label>
                                                            <textarea
                                                                value={game.description || ''}
                                                                onChange={(e) => {
                                                                    const newGames = [...games];
                                                                    newGames[index] = { ...newGames[index], description: e.target.value };
                                                                    setGames(newGames);
                                                                }}
                                                                placeholder="Descreva o jogo..."
                                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-400 outline-none focus:border-primary/50 transition-all resize-none h-20"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Preço (Kz)</label>
                                                                <input
                                                                    type="number"
                                                                    value={game.price || 0}
                                                                    onChange={(e) => {
                                                                        const newGames = [...games];
                                                                        newGames[index] = { ...newGames[index], price: Number(e.target.value) };
                                                                        setGames(newGames);
                                                                    }}
                                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-primary outline-none focus:border-primary/50 transition-all"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Prêmio Máximo</label>
                                                                <input
                                                                    type="text"
                                                                    value={game.maxPrize || ''}
                                                                    onChange={(e) => {
                                                                        const newGames = [...games];
                                                                        newGames[index] = { ...newGames[index], maxPrize: e.target.value };
                                                                        setGames(newGames);
                                                                    }}
                                                                    placeholder="Ex: 5.000.000 Kz"
                                                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-white outline-none focus:border-primary/50 transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'admins' && (
                                <div className="max-w-xl bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden">
                                    <div className="p-8 border-b border-slate-800 bg-slate-950/50">
                                        <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Administradores Autorizados</h4>
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        {admins.map((adm) => (
                                            <div key={adm.email} className="px-8 py-5 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <span className="material-icons-round text-primary text-sm">security</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-white">{adm.email}</span>
                                                </div>
                                                {adm.email !== ADMIN_MASTER && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('Remover acesso admin deste e-mail?')) {
                                                                await supabase.from('admins').delete().eq('email', adm.email);
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="text-slate-600 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-icons-round text-lg">remove_circle_outline</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
                                        <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase text-white tracking-widest leading-none">Guia de Verificação</h4>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2 focus:ring-2 focus:ring-primary/50 transition-all outline-none">Insira o código HTML (vídeo, instruções, etc) para a página de verificação</p>
                                            </div>
                                            <button
                                                onClick={handleUpdateSettings}
                                                className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <span className="material-icons-round text-sm">save</span>
                                                Salvar
                                            </button>
                                        </div>
                                        <div className="p-8 space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Conteúdo HTML (Vídeo/Tutorial)</label>
                                                <textarea
                                                    value={verificationHtml}
                                                    onChange={(e) => setVerificationHtml(e.target.value)}
                                                    placeholder="<iframe width='100%' height='315' src='https://www.youtube.com/embed/...' ...></iframe>"
                                                    className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm font-mono text-emerald-400 focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Delay do Botão (Segundos)</label>
                                                    <div className="relative">
                                                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">timer</span>
                                                        <input
                                                            type="number"
                                                            value={verificationDelay}
                                                            onChange={(e) => setVerificationDelay(Number(e.target.value))}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Taxa de Verificação (Kz)</label>
                                                    <div className="relative">
                                                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">payments</span>
                                                        <input
                                                            type="number"
                                                            value={verificationFee}
                                                            onChange={(e) => setVerificationFee(Number(e.target.value))}
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">URL de Redirecionamento (Verificação)</label>
                                                <div className="relative">
                                                    <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 text-lg">link</span>
                                                    <input
                                                        type="text"
                                                        value={verificationRedirectUrl}
                                                        onChange={(e) => setVerificationRedirectUrl(e.target.value)}
                                                        placeholder="Ex: https://meu-whatsapp.com OU https://outra-pagina.com"
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-4 items-start col-span-2">
                                                <span className="material-icons-round text-primary text-xl mt-0.5">help_outline</span>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest">Dica de Especialista</p>
                                                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed uppercase">
                                                        O usuário será redirecionado para esta URL ao clicar em "Verificar Conta". O sistema interno de vídeos e taxas foi desativado conforme solicitado.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Admin;

