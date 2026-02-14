import React from 'react';
import { GAMES } from '../constants';
import { Game } from '../types';

interface GameListProps {
    onSelectGame: (game: Game) => void;
}

const GameList: React.FC<GameListProps> = ({ onSelectGame }) => {
    return (
        <div className="grid grid-cols-1 gap-6 pb-20 md:pb-0">
            {GAMES.map((game) => (
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
        </div>
    );
};

export default GameList;
