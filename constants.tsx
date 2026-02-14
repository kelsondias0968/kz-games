
import { Game, Winner } from './types';

// Importing images directly to ensure Vite includes them in the build
import img1 from './IMG/R1.webp';
import img2 from './IMG/R2.webp';
import img3 from './IMG/R3.webp';

export const GAMES: Game[] = [
  {
    id: 'mega-black',
    name: 'MEGA RASPADA BLACK',
    price: 2500,
    maxPrize: '10.000.000 Kz',
    category: 'especial',
    accent: 'blue',
    image: img1,
    description: 'A raspadinha de elite para quem busca os maiores prêmios de Angola. Ganhe agora!'
  },
  {
    id: 'turbo-pix',
    name: 'TURBO PIX KZ',
    price: 1000,
    maxPrize: '2.500.000 Kz',
    category: 'dinheiro',
    accent: 'emerald',
    image: img2,
    description: 'Velocidade e prêmios altos. O caminho mais rápido para o seu primeiro milhão.'
  },
  {
    id: 'ostentacao-tech',
    name: 'SORTE RELÂMPAGO',
    price: 500,
    maxPrize: '500.000 Kz',
    category: 'dinheiro',
    accent: 'purple',
    image: img3,
    description: 'Pequena aposta, grande retorno. Comece sua jornada aqui com apenas 500 Kz.'
  }
];

export const WINNERS: Winner[] = [
  { id: '1', name: 'Kelson***', initials: 'KD', amount: '25.000 Kz', time: 'há 2 min', color: 'bg-blue-900/40 text-blue-400' },
  { id: '2', name: 'Mário***', initials: 'MA', amount: '5.000 Kz', time: 'há 5 min', color: 'bg-indigo-900/40 text-indigo-400' },
  { id: '3', name: 'Jorge***', initials: 'JO', amount: '100.000 Kz', time: 'há 12 min', color: 'bg-emerald-900/40 text-emerald-400' },
  { id: '4', name: 'Ana***', initials: 'AN', amount: '2.500 Kz', time: 'há 15 min', color: 'bg-purple-900/40 text-purple-400' },
  { id: '5', name: 'Beto***', initials: 'BE', amount: '50.000 Kz', time: 'há 18 min', color: 'bg-amber-900/40 text-amber-400' }
];

export const MIN_DEPOSIT = 3500;
