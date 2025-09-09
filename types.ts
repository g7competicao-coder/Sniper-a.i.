export enum SignalDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum SignalStatus {
  WIN = 'WIN',
  LOSS = 'LOSS',
  PARTIAL_WIN = 'PARTIAL_WIN',
}

export type MarketSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type HistoryFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';

export interface TradingSignal {
  id: string;
  symbol: string;
  pair: string;
  change24h: number;
  price: number;
  direction: SignalDirection;
  probability: number;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit: [number, number, number, number, number];
  confidence: string;
  riskNotes: string;
  timestamp: Date;
  tpsHit?: [boolean, boolean, boolean, boolean, boolean];
  safeLeverage: number;
  quoteVolume?: number;
  resolution?: {
    status: SignalStatus;
    message: string;
    timestamp: number;
  };
}

export interface HistoricalSignal extends TradingSignal {
  status: SignalStatus;
  resultPercent: number;
  resolvedAt: Date;
}

export interface CryptoInfo {
  symbol: string;
  name: string;
  ath: number;
  atl: number;
  maxSupply: string;
  totalSupply: string;
  marketCap: number;
  launchDate: string;
  category: string;
  website: string;
}