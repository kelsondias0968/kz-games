
export interface Game {
  id: string;
  name: string;
  price: number;
  maxPrize: string;
  category: 'dinheiro' | 'premios' | 'especial';
  image: string;
  description: string;
  accent: string;
}

export interface Winner {
  id: string;
  name: string;
  initials: string;
  amount: string;
  time: string;
  color: string;
}

export type View = 'home' | 'game' | 'bets' | 'profile' | 'auth' | 'admin' | 'games' | 'verify';
