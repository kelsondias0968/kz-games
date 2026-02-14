
import React, { useState, useEffect, useMemo } from 'react';
import WinnerCarousel from '../components/WinnerCarousel';
import { GAMES } from '../constants';
import { Game } from '../types';
import { supabase } from '../lib/supabase';

// Fallbacks estáticos
import banner1 from '../IMG/banner1.png';
import banner2 from '../IMG/banner2.png';

interface HomeProps {
  onSelectGame: (game: Game) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectGame }) => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [dynamicBanners, setDynamicBanners] = useState<{ url: string; active: boolean }[]>([]);
  const [dynamicGames, setDynamicGames] = useState<Game[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: bData } = await supabase.from('site_settings').select('value').eq('key', 'banners').single();
      if (bData?.value) setDynamicBanners(bData.value);

      const { data: gData } = await supabase.from('site_settings').select('value').eq('key', 'games').single();
      if (gData?.value) setDynamicGames(gData.value);
    };
    fetchSettings();
  }, []);

  const banners = useMemo(() => {
    const active = dynamicBanners.filter(b => b.active).map(b => b.url);
    return active.length > 0 ? active : [banner1, banner2];
  }, [dynamicBanners]);

  const displayGames = useMemo(() => {
    return dynamicGames.length > 0 ? dynamicGames : GAMES;
  }, [dynamicGames]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="space-y-8">
      {/* Banner Slider */}
      <section className="relative overflow-hidden rounded-3xl aspect-[21/9] shadow-2xl border border-white/5">
        {banners.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentBanner ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <img
              src={src}
              alt={`Banner ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="w-full h-full object-contain bg-gradient-to-br from-slate-900 to-slate-800"
            />
            {/* Overlay sutil para manter o estilo premium */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        ))}

        {/* Indicadores do Slider */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${index === currentBanner ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                }`}
            />
          ))}
        </div>
      </section>

      {/* Winners Carousel */}
      <WinnerCarousel />

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-primary uppercase italic tracking-tighter">Raspadinhas</h2>
        <div className="flex gap-2">
          <button className="bg-primary text-white px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-primary/30">Todos</button>
          <button className="bg-slate-900 text-slate-500 px-5 py-2 rounded-full text-xs font-bold border border-slate-800">Dinheiro</button>
          <button className="bg-slate-900 text-slate-500 px-5 py-2 rounded-full text-xs font-bold border border-slate-800">Prêmios</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6">
        {displayGames.map((game) => (
          <div key={game.id} className="bg-card-dark rounded-[24px] overflow-hidden border border-slate-800 shadow-xl group relative">
            <div className="relative h-56 overflow-hidden">
              <img
                alt={game.name}
                loading="lazy"
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                src={game.image}
              />
              <div className="absolute inset-0 p-5 flex flex-col justify-between bg-gradient-to-t from-card-dark via-black/40 to-transparent">
                <span className={`self-start ${game.accent === 'blue' ? 'bg-blue-600' : game.accent === 'emerald' ? 'bg-emerald-600' : 'bg-purple-600'} text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-lg`}>
                  {game.category}
                </span>
                <div className="text-white drop-shadow-md">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-1">{game.name}</h3>
                  <p className={`text-sm font-bold flex items-center gap-1 ${game.accent === 'blue' ? 'text-blue-300' : game.accent === 'emerald' ? 'text-emerald-300' : 'text-purple-300'}`}>
                    <span className="material-icons-round text-base">emoji_events</span>
                    Prêmios de até {game.maxPrize}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4 bg-card-dark/95 backdrop-blur-sm">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">{game.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Preço</span>
                  <span className="text-xl font-black text-primary">{game.price.toLocaleString('pt-AO')} Kz</span>
                </div>
                <button
                  onClick={() => onSelectGame(game)}
                  className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span className="material-icons-round text-sm">play_arrow</span>
                  Jogar
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer Branding */}
      <footer className="pt-8 border-t border-slate-800 space-y-8 pb-10 text-center">
        <div className="flex items-center justify-center gap-2">
          <img src="/logo.png" alt="Kz GAMES" className="h-20 w-auto object-contain" />
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-black px-6">
          © 2024 KZ GAMES INTERACTIVE. TODOS OS DIREITOS RESERVADOS. JOGUE COM RESPONSABILIDADE. PROIBIDO PARA MENORES DE 18 ANOS.
        </p>
        <div className="grid grid-cols-2 gap-8 text-left">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-primary border-b border-primary/20 pb-1 tracking-widest">Regulamentos</h4>
            <ul className="space-y-2">
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">Jogo Responsável</a></li>
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">Privacidade</a></li>
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">Termos de Uso</a></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-primary border-b border-primary/20 pb-1 tracking-widest">Suporte</h4>
            <ul className="space-y-2">
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">FAQ</a></li>
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">Como Jogar</a></li>
              <li><a className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase" href="#">WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-4">
          <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">Desenvolvido por <span className="text-primary">Premium Dev Lab</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
