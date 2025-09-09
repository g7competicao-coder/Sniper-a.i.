



import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { SignalCard } from './components/SignalCard';
import { HistoryView } from './components/HistoryView';
import { BottomNav } from './components/BottomNav';
import { TradingSignal, HistoricalSignal, SignalStatus, SignalDirection, MarketSentiment, HistoryFilter } from './types';
import { getTradingSignals, getAllFuturesTickers, removeSignalFromCache } from './services/mockSignalService';
import { getMarketSentiment } from './services/sentimentService';
import * as historyService from './services/historyService';
import * as activeSignalService from './services/activeSignalService';

const App: React.FC = () => {
  const [view, setView] = useState<'signals' | 'history'>('signals');
  const [signals, setSignals] = useState<TradingSignal[]>(() => activeSignalService.getActiveSignals());
  const [historicalSignals, setHistoricalSignals] = useState<HistoricalSignal[]>(() => historyService.getHistory());
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date(Date.now()));
  const [error, setError] = useState<string | null>(null);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment>('NEUTRAL');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [customHistoryDate, setCustomHistoryDate] = useState<Date | null>(null);
  const [bitcoinData, setBitcoinData] = useState<{ price: number; change: number } | null>(null);
  const [usdtBrlData, setUsdtBrlData] = useState<{ price: number; change: number } | null>(null);

  useEffect(() => {
    activeSignalService.saveActiveSignals(signals);
  }, [signals]);

  useEffect(() => {
    historyService.saveHistory(historicalSignals);
  }, [historicalSignals]);

  useEffect(() => {
    const fetchSentiment = async () => {
      const sentiment = await getMarketSentiment();
      setMarketSentiment(sentiment);
    };

    fetchSentiment(); // Initial fetch
    const interval = setInterval(fetchSentiment, 3600000); // Refresh every 1 hour

    return () => clearInterval(interval);
  }, []);

  const fetchSignals = useCallback(async () => {
    if (signals.length === 0) {
        setLoading(true);
    }
    
    let priceMap: Map<string, { price: number; change: number; volume: number }> | null = null;
    let connectionHasError = false;

    try {
      const allTickers = await getAllFuturesTickers();
      
      const btcTicker = allTickers.find(t => t.symbol === 'BTCUSDT');
      if (btcTicker) {
        setBitcoinData({
          price: parseFloat(btcTicker.lastPrice) || 0,
          change: parseFloat(btcTicker.priceChangePercent) || 0,
        });
      }

      try {
        const usdtBrlResponse = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=USDTBRL');
        if (usdtBrlResponse.ok) {
            const usdtBrlTicker = await usdtBrlResponse.json();
            setUsdtBrlData({
              price: parseFloat(usdtBrlTicker.lastPrice) || 0,
              change: parseFloat(usdtBrlTicker.priceChangePercent) || 0,
            });
        } else {
            console.warn('Could not fetch USDT/BRL price from Binance Spot API.');
        }
      } catch (e) {
        console.error('Error fetching USDT/BRL price:', e);
      }

      priceMap = new Map<string, { price: number; change: number; volume: number }>(
        allTickers.map(t => [t.symbol, { 
            price: parseFloat(t.lastPrice) || 0, 
            change: parseFloat(t.priceChangePercent) || 0,
            volume: parseFloat(t.quoteVolume) || 0
        }])
      );
      
    } catch (e) {
      console.error("Failed to fetch signals:", e);
      connectionHasError = true;
    }

    // --- Signal Processing Logic ---
    // This section now runs regardless of the API connection status to ensure rules are always enforced.
    
    const newActiveSignals = [...signals];
    let newHistoricalSignals = [...historicalSignals];
    const signalsToRemoveFromActive: string[] = [];
    const now = Date.now();
    let historyChanged = false;
    const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

    for (let i = 0; i < newActiveSignals.length; i++) {
      const signal = newActiveSignals[i];
      
      // RULE 1: Time limit check (unconditional)
      const signalAge = now - new Date(signal.timestamp).getTime();
      if (signalAge > TWO_HOURS_IN_MS) {
          signalsToRemoveFromActive.push(signal.id);
          removeSignalFromCache(signal.id);
          continue;
      }

      // Price-based checks are conditional on having a priceMap
      const tickerData = priceMap ? priceMap.get(signal.id) : null;
      if (!tickerData) {
        // No price data, cannot check SL/TP, so we keep the signal for the next tick.
        // It will eventually be removed by the time limit check.
        continue;
      }

      let updatedSignal = { 
        ...signal,
        price: tickerData.price,
        change24h: tickerData.change,
        quoteVolume: tickerData.volume,
      };
      const currentPrice = updatedSignal.price;
      
      let resolutionStatus: SignalStatus | null = null;
      // RULE 2: Stop-loss check
      if ((updatedSignal.direction === SignalDirection.LONG && currentPrice <= updatedSignal.stopLoss) ||
          (updatedSignal.direction === SignalDirection.SHORT && currentPrice >= updatedSignal.stopLoss)) {
        resolutionStatus = SignalStatus.LOSS;
      }
      
      const oldTpsHit = [...(updatedSignal.tpsHit || [false, false, false, false, false])];
      const newTpsHit = [...oldTpsHit];
      let hasNewTp = false;

      for (let j = 0; j < 5; j++) {
        if (!newTpsHit[j]) {
          const tpPrice = updatedSignal.takeProfit[j];
          if ((updatedSignal.direction === SignalDirection.LONG && currentPrice >= tpPrice) ||
              (updatedSignal.direction === SignalDirection.SHORT && currentPrice <= tpPrice)) {
            newTpsHit[j] = true;
            hasNewTp = true;
          }
        }
      }

      if(hasNewTp) {
          updatedSignal.tpsHit = newTpsHit as [boolean, boolean, boolean, boolean, boolean];
      }
      
      // RULE 3: All targets hit check
      if (newTpsHit[4]) {
        resolutionStatus = SignalStatus.WIN;
      }
      
      const uniqueSignalId = signal.id + signal.timestamp.getTime();
      const existingHistoryIndex = newHistoricalSignals.findIndex(h => (h.id + h.timestamp.getTime()) === uniqueSignalId);

      if (resolutionStatus) {
          signalsToRemoveFromActive.push(signal.id);
          removeSignalFromCache(signal.id);
          const entryPrice = (signal.entryZone[0] + signal.entryZone[1]) / 2;
          let resultPercent;
          if (resolutionStatus === SignalStatus.LOSS) {
              resultPercent = (signal.direction === SignalDirection.LONG)
                  ? ((signal.stopLoss - entryPrice) / entryPrice) * 100
                  : ((entryPrice - signal.stopLoss) / entryPrice) * 100;
          } else {
              const finalPrice = signal.takeProfit[4];
              resultPercent = (signal.direction === SignalDirection.LONG)
                  ? ((finalPrice - entryPrice) / entryPrice) * 100
                  : ((entryPrice - finalPrice) / entryPrice) * 100;
          }
          const resolvedSignal: HistoricalSignal = {
              ...updatedSignal,
              status: resolutionStatus,
              resultPercent,
              resolvedAt: new Date(now),
          };

          if (existingHistoryIndex !== -1) {
              newHistoricalSignals[existingHistoryIndex] = resolvedSignal;
          } else {
              newHistoricalSignals.unshift(resolvedSignal);
          }
          historyChanged = true;

      } else if (hasNewTp || (updatedSignal.tpsHit && existingHistoryIndex === -1)) {
          const entryPrice = (signal.entryZone[0] + signal.entryZone[1]) / 2;
          const lastHitTpIndex = newTpsHit.lastIndexOf(true);
          if (lastHitTpIndex === -1) continue;

          const lastHitTpPrice = signal.takeProfit[lastHitTpIndex];
          const resultPercent = (signal.direction === SignalDirection.LONG)
              ? ((lastHitTpPrice - entryPrice) / entryPrice) * 100
              : ((entryPrice - lastHitTpPrice) / entryPrice) * 100;

          const partialSignal: HistoricalSignal = {
              ...updatedSignal,
              status: SignalStatus.PARTIAL_WIN,
              resultPercent,
              resolvedAt: new Date(now),
          };

          if (existingHistoryIndex !== -1) {
              if (JSON.stringify(newHistoricalSignals[existingHistoryIndex].tpsHit) !== JSON.stringify(newTpsHit)) {
                  newHistoricalSignals[existingHistoryIndex] = partialSignal;
                  historyChanged = true;
              }
          } else {
              newHistoricalSignals.unshift(partialSignal);
              historyChanged = true;
          }
          newActiveSignals[i] = updatedSignal;
      } else {
          newActiveSignals[i] = updatedSignal;
      }
    }
    
    if (historyChanged) {
      setHistoricalSignals(newHistoricalSignals);
    }

    const stillActiveSignals = newActiveSignals.filter(s => !signalsToRemoveFromActive.includes(s.id));
    
    let finalSignals = [...stillActiveSignals];
    
    // If there is a connection, check if we need to fetch new signals to replace removed ones or to fill the board.
    if (!connectionHasError) {
        const neededSignals = 8 - finalSignals.length;
        if (neededSignals > 0) {
            const currentSymbols = finalSignals.map(s => s.id);
            const newSignals = await getTradingSignals(neededSignals, currentSymbols);
            if (newSignals.length > 0) {
                finalSignals.push(...newSignals);
            }
        }
    }
    
    finalSignals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    setSignals(finalSignals);
    setLastUpdated(new Date(Date.now()));

    if (connectionHasError) {
        const errorMessage = "Não foi possível conectar à Binance. Verificando novamente...";
        setError(errorMessage);
    } else if (finalSignals.length > 0) {
      setError(null);
    } else {
      setError("Nenhum sinal ativo no momento. O sistema está buscando novas oportunidades.");
    }

    setLoading(false);

  }, [signals, historicalSignals]);


  const savedFetchSignals = useRef<() => void>();
  useEffect(() => {
    savedFetchSignals.current = fetchSignals;
  }, [fetchSignals]);
  
  useEffect(() => {
    const tick = () => {
      savedFetchSignals.current?.();
    };
    
    tick(); // Initial fetch
    const intervalId = setInterval(tick, 5000);

    return () => clearInterval(intervalId);
  }, []);
  
  const historyReport = useMemo(() => {
    // FIX: Called new Date() without arguments. Pass Date.now() to fix.
    const now = new Date(Date.now());

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const dayOfWeek = now.getUTCDay();
    const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));


    const filteredSignals = historicalSignals.filter(signal => {
        const signalDate = signal.resolvedAt || signal.timestamp;
        if (!signalDate) {
            return false;
        }

        switch(historyFilter) {
            case 'day': return signalDate >= today;
            case 'week': return signalDate >= startOfWeek;
            case 'month': return signalDate >= startOfMonth;
            case 'year': return signalDate >= startOfYear;
            case 'custom': {
                if (!customHistoryDate) return false;
                const selectedDayStart = new Date(customHistoryDate);
                const selectedDayEnd = new Date(selectedDayStart);
                selectedDayEnd.setUTCDate(selectedDayEnd.getUTCDate() + 1);
                return signalDate >= selectedDayStart && signalDate < selectedDayEnd;
            }
            case 'all':
            default:
                return true;
        }
    });

    const completedSignals = filteredSignals.filter(s => s.status === SignalStatus.WIN || s.status === SignalStatus.LOSS);
    const wins = completedSignals.filter(s => s.status === SignalStatus.WIN).length;
    const losses = completedSignals.filter(s => s.status === SignalStatus.LOSS).length;
    const totalTrades = completedSignals.length;

    if (filteredSignals.length === 0) {
        return {
            summary: { totalPnl: 0, winRate: 0, totalTrades: 0, bestTrade: null, wins: 0, losses: 0 },
            groupedByDay: {}
        };
    }
    
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnl = completedSignals.reduce((acc, s) => acc + s.resultPercent, 0);
    
    let bestTrade: HistoricalSignal | null = null;
    if (completedSignals.length > 0) {
      bestTrade = completedSignals[0];
      for (let i = 1; i < completedSignals.length; i++) {
        if (completedSignals[i].resultPercent > bestTrade.resultPercent) {
          bestTrade = completedSignals[i];
        }
      }
    }

    const groupedByDay = filteredSignals.reduce((acc, signal) => {
        const signalDate = signal.resolvedAt || signal.timestamp;
        const year = signalDate.getUTCFullYear();
        const month = (signalDate.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = signalDate.getUTCDate().toString().padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!acc[dateKey]) {
            acc[dateKey] = { signals: [], dailyPnl: 0, wins: 0, losses: 0 };
        }
        acc[dateKey].signals.push(signal);
        
        if (signal.status === SignalStatus.WIN || signal.status === SignalStatus.LOSS || signal.status === SignalStatus.PARTIAL_WIN) {
          acc[dateKey].dailyPnl += signal.resultPercent;
          
          if (signal.status === SignalStatus.WIN) {
              acc[dateKey].wins++;
          } else if (signal.status === SignalStatus.LOSS) {
              acc[dateKey].losses++;
          }
        }
        return acc;
    }, {} as Record<string, { signals: HistoricalSignal[], dailyPnl: number, wins: number, losses: number }>);
    
    for (const dateKey in groupedByDay) {
      groupedByDay[dateKey].signals.sort((a, b) => {
        const dateA = a.resolvedAt || a.timestamp;
        const dateB = b.resolvedAt || b.timestamp;
        return dateB.getTime() - dateA.getTime();
      });
    }

    return {
        summary: { totalPnl, winRate, totalTrades, bestTrade, wins, losses },
        groupedByDay
    };

  }, [historicalSignals, historyFilter, customHistoryDate]);

  const handleFilterChange = (filter: HistoryFilter) => {
    if (filter !== 'custom') {
      setCustomHistoryDate(null);
    }
    setHistoryFilter(filter);
  };

  const handleDateChange = (date: Date | null) => {
    setCustomHistoryDate(date);
    handleFilterChange(date ? 'custom' : 'all');
  };


  const renderSignalCards = () => {
    if (loading && signals.length === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-gray-800 rounded-xl h-[540px] flex items-center justify-center">
               <svg
                className="h-24 w-24 animate-spin"
                viewBox="0 0 50 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="25" cy="25" r="24" stroke="black" strokeWidth="2" />
                <circle cx="25" cy="25" r="20" stroke="#FF4D4D" strokeWidth="2" />
                <line x1="25" y1="5" x2="25" y2="12" stroke="#FF4D4D" strokeWidth="3" />
                <line x1="25" y1="38" x2="25" y2="45" stroke="#FF4D4D" strokeWidth="3" />
                <line x1="5" y1="25" x2="12" y2="25" stroke="#FF4D4D" strokeWidth="3" />
                <line x1="38" y1="25" x2="45" y2="25" stroke="#FF4D4D" strokeWidth="3" />
                <g strokeLinecap="round">
                    <line x1="15" y1="31" x2="15" y2="34" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="14" y="32" width="2" height="1.5" fill="#00FFA3" />
                    <line x1="18" y1="28" x2="18" y2="32" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="17" y="29" width="2" height="2.5" fill="#00FFA3" />
                    <line x1="21" y1="26" x2="21" y2="30" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="20" y="27" width="2" height="2.5" fill="#00FFA3" />
                    <line x1="25" y1="23" x2="25" y2="31" stroke="#FF4D4D" strokeWidth="1.5" />
                    <rect x="24" y="24" width="2" height="6" fill="#FF4D4D" />
                    <line x1="29" y1="22" x2="29" y2="27" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="28" y="23" width="2" height="3" fill="#00FFA3" />
                    <line x1="32" y1="19" x2="32" y2="25" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="31" y="20" width="2" height="4" fill="#00FFA3" />
                    <line x1="35" y1="16" x2="35" y2="23" stroke="#00FFA3" strokeWidth="1.5" />
                    <rect x="34" y="17" width="2" height="5" fill="#00FFA3" />
                </g>
              </svg>
            </div>
          ))}
        </div>
      );
    }

    if (error && signals.length === 0) {
      return (
        <div className="text-center py-10 px-4 bg-gray-800 rounded-lg">
          <p className="text-brand-red font-semibold text-lg">Atenção</p>
          <p className="text-gray-400 mt-2">{error}</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {signals.map(signal => (
          <SignalCard
            key={signal.id}
            signal={signal}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <Header 
        lastUpdated={lastUpdated} 
        currentView={view}
        onToggleView={() => setView(v => v === 'signals' ? 'history' : 'signals')}
        marketSentiment={marketSentiment}
        bitcoinData={bitcoinData}
        usdtBrlData={usdtBrlData}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        {view === 'signals' && (
           <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">Top 8 Ativos do Mercado Futuro (USDT)</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Ao Vivo - Binance Futuros</span>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-green"></span>
              </span>
            </div>
          </div>
        )}
       
        {view === 'signals' 
            ? renderSignalCards() 
            : <HistoryView 
                report={historyReport} 
                currentFilter={historyFilter} 
                onFilterChange={handleFilterChange}
                currentDate={customHistoryDate}
                onDateChange={handleDateChange}
              />
        }
      </main>
      <BottomNav
        currentView={view}
        onViewChange={setView}
      />
    </div>
  );
};

export default App;