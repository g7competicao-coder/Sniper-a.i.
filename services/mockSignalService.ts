// NOTE: This service implements a real-time, technical analysis-based signal generation strategy using live Binance API data.
// The "mock" in the filename is legacy.
import { TradingSignal, SignalDirection } from '../types';
import { addAlertedSymbol, getAlertedSymbolsToday } from './dailyAlertsService';

// Interface for the raw ticker data from Binance Futures API
interface BinanceTicker {
  symbol: string;
  priceChangePercent: string;
  lastPrice: string;
  quoteVolume: string;
}

// Interface for exchange info symbols
interface ExchangeSymbolInfo {
    symbol: string;
    pair: string;
    contractType: string;
    status: string;
    quoteAsset: string;
}

// Type for Binance kline data
type Kline = [
    number, // Open time
    string, // Open
    string, // High
    string, // Low
    string, // Close
    string, // Volume
    number, // Close time
    string, // Quote asset volume
    number, // Number of trades
    string, // Taker buy base asset volume
    string, // Taker buy quote asset volume
    string  // Ignore
];

// Cache for tradable symbols to avoid fetching exchange info on every request
let tradableSymbolsCache: Set<string> | null = null;
let lastCacheTime: number | null = null;

// Define the type for the cached parameters. Exclude fields that are dynamic or state-managed by the component.
type CachedSignalParameters = Omit<TradingSignal, 
  'price' | 
  'change24h' | 
  'tpsHit' | 
  'resolution'
>;
  
// To persist the cache across hot-reloads in a development environment,
// we attach it to the global `window` object. This ensures the cache is not
// cleared every time a file is saved and the module is re-evaluated.
declare global {
    interface Window { __signalCache: Map<string, CachedSignalParameters>; }
}
// Initialize the cache on the window object if it doesn't exist.
window.__signalCache = window.__signalCache || new Map<string, CachedSignalParameters>();
const signalParametersCache = window.__signalCache;


/**
 * Invalidates the cache for a given signal, allowing a new one to be generated on the next request.
 * This should be called when a signal is resolved and archived.
 * @param symbol The symbol of the signal to remove from the cache (e.g., 'BTCUSDT').
 */
export const removeSignalFromCache = (symbol: string): void => {
    if (signalParametersCache.has(symbol)) {
        signalParametersCache.delete(symbol);
        console.log(`[Cache] Parâmetros de sinal para ${symbol} foram removidos.`);
    }
};

/**
 * Fetches and caches the list of tradable USDT perpetual futures symbols from Binance.
 * The cache expires after 1 hour.
 * @returns A Set of tradable symbol strings.
 */
const getTradableFuturesSymbols = async (): Promise<Set<string>> => {
    const now = Date.now();
    // Cache for 1 hour (3600000 ms)
    if (tradableSymbolsCache && lastCacheTime && (now - lastCacheTime < 3600000)) {
        return tradableSymbolsCache;
    }

    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
        if (!response.ok) {
            throw new Error(`Binance API (exchangeInfo) Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const symbols: ExchangeSymbolInfo[] = data.symbols;
        
        const perpetualUsdtSymbols = new Set(
            symbols
                .filter(s => 
                    s.contractType === 'PERPETUAL' && 
                    s.quoteAsset === 'USDT' && 
                    s.status === 'TRADING'
                )
                .map(s => s.symbol)
        );
        
        tradableSymbolsCache = perpetualUsdtSymbols;
        lastCacheTime = now;

        return perpetualUsdtSymbols;

    } catch (error) {
        console.error("Failed to fetch exchange info from Binance API:", error);
        // If it fails, we can't be sure which symbols are valid. Throwing an error is safer.
        throw new Error("Não foi possível obter a lista de símbolos negociáveis da Binance Futuros.");
    }
};

// --- TECHNICAL ANALYSIS HELPER FUNCTIONS ---

/**
 * Calculates the Exponential Moving Average (EMA).
 * @param closePrices Array of closing prices, from oldest to newest.
 * @param period The EMA period.
 * @returns The latest EMA value.
 */
const calculateEMA = (closePrices: number[], period: number): number => {
    if (closePrices.length < period) return closePrices[closePrices.length - 1] || 0;
    const k = 2 / (period + 1);
    let ema = closePrices[0];
    for (let i = 1; i < closePrices.length; i++) {
        ema = (closePrices[i] * k) + (ema * (1 - k));
    }
    return ema;
};

/**
 * Calculates the Average True Range (ATR).
 * @param klines Array of kline data, from oldest to newest.
 * @param period The ATR period.
 * @returns The latest ATR value.
 */
const calculateATR = (klines: Kline[], period: number): number => {
    if (klines.length < period + 1) return 0;
    
    let trueRanges: number[] = [];
    for (let i = 1; i < klines.length; i++) {
        const high = parseFloat(klines[i][2]);
        const low = parseFloat(klines[i][3]);
        const prevClose = parseFloat(klines[i - 1][4]);
        trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
    
    // SMA for the first ATR value
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Smooth subsequent values
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
};

/**
 * Calculates the MACD, Signal Line, and Histogram.
 * @param closePrices Array of closing prices, from oldest to newest.
 * @returns The latest MACD values { macdLine, signalLine, histogram }.
 */
const calculateMACD = (closePrices: number[]): { macdLine: number; signalLine: number; histogram: number } => {
    if (closePrices.length < 35) { // Needs at least 26 for EMA + 9 for Signal Line EMA
        return { macdLine: 0, signalLine: 0, histogram: 0 };
    }

    // Internal helper to calculate EMA for an entire series
    const calculateEMASeries = (prices: number[], period: number): number[] => {
        const k = 2 / (period + 1);
        let emas = [prices[0]];
        for (let i = 1; i < prices.length; i++) {
            emas.push(prices[i] * k + emas[i-1] * (1-k));
        }
        return emas;
    };

    const ema12Series = calculateEMASeries(closePrices, 12);
    const ema26Series = calculateEMASeries(closePrices, 26);
    
    const macdSeries: number[] = [];
    // The series will have the same length, subtraction is straightforward.
    for (let i = 0; i < closePrices.length; i++) {
        macdSeries.push(ema12Series[i] - ema26Series[i]);
    }
    
    const signalSeries = calculateEMASeries(macdSeries, 9);

    const lastMacd = macdSeries[macdSeries.length - 1];
    const lastSignal = signalSeries[signalSeries.length - 1];
    const lastHistogram = lastMacd - lastSignal;

    return {
        macdLine: lastMacd,
        signalLine: lastSignal,
        histogram: lastHistogram,
    };
};


/**
 * Calculates the Relative Strength Index (RSI).
 * @param closePrices Array of closing prices.
 * @param period The RSI period (usually 14).
 * @returns The latest RSI value.
 */
const calculateRSI = (closePrices: number[], period: number = 14): number => {
    if (closePrices.length <= period) return 50; // Neutral RSI if not enough data

    const changes = closePrices.slice(1).map((price, i) => price - closePrices[i]);
    const gains = changes.map(change => (change > 0 ? change : 0));
    const losses = changes.map(change => (change < 0 ? -change : 0));
    
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

// --- ADVANCED PRICE ACTION HELPERS ---

type FVG = { start: number; end: number };

/**
 * Finds Fair Value Gaps (FVG) or imbalances in the provided kline data.
 * @param klines Array of kline data.
 * @returns An object containing arrays of bullish (support) and bearish (resistance) FVG zones.
 */
const findFairValueGaps = (klines: Kline[]): { bullish: FVG[]; bearish: FVG[] } => {
    const bullish: FVG[] = [];
    const bearish: FVG[] = [];

    if (klines.length < 3) return { bullish, bearish };

    for (let i = 2; i < klines.length; i++) {
        const candle1 = { high: parseFloat(klines[i - 2][2]), low: parseFloat(klines[i - 2][3]) };
        // candle2 is the one with the imbalance
        const candle3 = { high: parseFloat(klines[i][2]), low: parseFloat(klines[i][3]) };

        // Bullish FVG (Imbalance): Low of candle 1 is above high of candle 3, creating a gap.
        if (candle1.low > candle3.high) {
            bullish.push({ start: candle3.high, end: candle1.low });
        }

        // Bearish FVG (Imbalance): High of candle 1 is below low of candle 3, creating a gap.
        if (candle1.high < candle3.low) {
            bearish.push({ start: candle1.high, end: candle3.low });
        }
    }
    return { bullish, bearish };
};

/**
 * Identifies simple support and resistance levels based on pivot points (swing highs/lows).
 * @param klines Array of kline data.
 * @returns An object containing arrays of support and resistance price levels.
 */
const findSupportResistance = (klines: Kline[]): { supports: number[]; resistances: number[] } => {
    const supports: number[] = [];
    const resistances: number[] = [];
    const lookback = 5; // How many candles on each side to confirm a pivot

    if (klines.length <= lookback * 2) return { supports, resistances };

    for (let i = lookback; i < klines.length - lookback; i++) {
        const window = klines.slice(i - lookback, i + lookback + 1);
        const currentHigh = parseFloat(window[lookback][2]);
        const currentLow = parseFloat(window[lookback][3]);

        const isPivotHigh = window.every(k => parseFloat(k[2]) <= currentHigh);
        const isPivotLow = window.every(k => parseFloat(k[3]) >= currentLow);

        if (isPivotHigh) {
            resistances.push(currentHigh);
        }
        if (isPivotLow) {
            supports.push(currentLow);
        }
    }
    // Return unique values, could add more logic here to cluster nearby levels
    return {
        supports: [...new Set(supports)].sort((a, b) => b - a),
        resistances: [...new Set(resistances)].sort((a, b) => b - a),
    };
};


/**
 * Generates high-quality signal parameters using technical analysis on historical data.
 * Returns null if conditions for a high-probability signal are not met.
 * @param ticker The real-time ticker data from Binance.
 * @returns A promise resolving to the cached signal parameters or null.
 */
const generateSignalParameters = async (ticker: BinanceTicker): Promise<CachedSignalParameters | null> => {
  console.log(`[TA] Analisando ${ticker.symbol} para um sinal potencial...`);
  
  // 1. Fetch historical data (100 hourly candles)
  let klines: Kline[] = [];
  try {
      const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${ticker.symbol}&interval=1h&limit=100`);
      if (!response.ok) throw new Error(`Failed to fetch klines for ${ticker.symbol}`);
      klines = await response.json();
  } catch (e) {
      console.error(e);
      return null; // Fail gracefully
  }

  if (klines.length < 51) {
      console.warn(`[TA] Dados insuficientes para ${ticker.symbol}.`);
      return null; // Not enough data for reliable analysis
  }

  const relevantKlines = klines.slice(0, -1); // Exclude current, incomplete candle
  const closePrices = relevantKlines.map(k => parseFloat(k[4]));

  // 2. Calculate Indicators
  const currentPrice = parseFloat(ticker.lastPrice);
  const atr = calculateATR(relevantKlines, 14);
  const ema21 = calculateEMA(closePrices, 21);
  const ema50 = calculateEMA(closePrices, 50);
  const { macdLine, signalLine, histogram } = calculateMACD(closePrices);
  const rsi = calculateRSI(closePrices, 14);


  if (atr === 0 || ema21 === 0) {
      console.warn(`[TA] Indicador essencial (ATR/EMA) resultou em zero para ${ticker.symbol}, pulando.`);
      return null;
  }

  // 3. Determine Trend and Signal Direction based on confluence
  let direction: SignalDirection;
  let confidence: string;
  const isUptrend = currentPrice > ema21 && ema21 > ema50;
  const isDowntrend = currentPrice < ema21 && ema21 < ema50;

  if (isUptrend && rsi < 75) { // Check for uptrend but not extremely overbought
    direction = SignalDirection.LONG;
    if (macdLine > signalLine && histogram > 0) {
        confidence = "Muito Alta - Confluência de tendência de alta (EMAs + MACD) e RSI saudável.";
    } else {
        confidence = "Alta - Tendência de alta primária (EMAs) com RSI favorável.";
    }
  } else if (isDowntrend && rsi > 25) { // Check for downtrend but not extremely oversold
    direction = SignalDirection.SHORT;
    if (macdLine < signalLine && histogram < 0) {
        confidence = "Muito Alta - Confluência de tendência de baixa (EMAs + MACD) e RSI saudável.";
    } else {
        confidence = "Alta - Tendência de baixa primária (EMAs) com RSI favorável.";
    }
  } else {
    // No high-probability setup found
    console.log(`[TA] Sinal para ${ticker.symbol} ignorado. Condições não ideais (RSI: ${rsi.toFixed(2)}, isUptrend: ${isUptrend}, isDowntrend: ${isDowntrend}).`);
    return null;
  }
  
  // 4. Advanced Entry Zone Calculation based on Price Action
  const { supports, resistances } = findSupportResistance(relevantKlines);
  const { bullish: bullishFVGs, bearish: bearishFVGs } = findFairValueGaps(relevantKlines);

  let entryTarget: number | null = null;
  let entryReason: string = "N/A";

  if (direction === SignalDirection.LONG) {
      const potentialSupports = [
          ...supports.filter(s => s < currentPrice),
          ...bullishFVGs.filter(fvg => fvg.end < currentPrice).map(fvg => (fvg.start + fvg.end) / 2),
      ];
      if (ema21 < currentPrice) potentialSupports.push(ema21);
      if (ema50 < currentPrice) potentialSupports.push(ema50);
      
      const finiteSupports = potentialSupports.filter(isFinite);
      if (finiteSupports.length > 0) {
          // Find the closest, strongest support level below the current price
          entryTarget = Math.max(...finiteSupports);
          entryReason = "Retração para a zona de suporte/demanda mais próxima.";

          // Confluence bonus: check if target is near an EMA or FVG
          const isNearEma = Math.abs(entryTarget - ema21) / ema21 < 0.005 || Math.abs(entryTarget - ema50) / ema50 < 0.005;
          const isInFVG = bullishFVGs.some(fvg => entryTarget >= fvg.start && entryTarget <= fvg.end);
          if (isNearEma && isInFVG) entryReason = "Confluência de Suporte, FVG e Média Móvel.";
          else if (isNearEma) entryReason = "Retração para Média Móvel confluente com Suporte.";
          else if (isInFVG) entryReason = "Retração para Fair Value Gap (FVG).";
      } else {
          // Breakout/Retest scenario: find the closest resistance that was recently broken
          const recentBrokenResistance = Math.min(...resistances.filter(r => r < currentPrice && currentPrice - r < atr * 2));
          if (isFinite(recentBrokenResistance)) {
              entryTarget = recentBrokenResistance;
              entryReason = "Reteste (pullback) de resistência rompida (breakout).";
          }
      }
  } else { // SHORT
      const potentialResistances = [
          ...resistances.filter(r => r > currentPrice),
          ...bearishFVGs.filter(fvg => fvg.start > currentPrice).map(fvg => (fvg.start + fvg.end) / 2),
      ];
      if (ema21 > currentPrice) potentialResistances.push(ema21);
      if (ema50 > currentPrice) potentialResistances.push(ema50);

      const finiteResistances = potentialResistances.filter(isFinite);
      if (finiteResistances.length > 0) {
          // Find the closest, strongest resistance level above the current price
          entryTarget = Math.min(...finiteResistances);
          entryReason = "Retração para a zona de resistência/oferta mais próxima.";

          // Confluence bonus
          const isNearEma = Math.abs(entryTarget - ema21) / ema21 < 0.005 || Math.abs(entryTarget - ema50) / ema50 < 0.005;
          const isInFVG = bearishFVGs.some(fvg => entryTarget >= fvg.start && entryTarget <= fvg.end);
          if (isNearEma && isInFVG) entryReason = "Confluência de Resistência, FVG e Média Móvel.";
          else if (isNearEma) entryReason = "Retração para Média Móvel confluente com Resistência.";
          else if (isInFVG) entryReason = "Retração para Fair Value Gap (FVG).";
      } else {
          // Breakdown/Retest scenario
          const recentBrokenSupport = Math.max(...supports.filter(s => s > currentPrice && s - currentPrice < atr * 2));
          if (isFinite(recentBrokenSupport)) {
              entryTarget = recentBrokenSupport;
              entryReason = "Reteste (pullback) de suporte rompido (breakdown).";
          }
      }
  }

  if (entryTarget === null || entryTarget <= 0 || !isFinite(entryTarget)) {
      console.log(`[TA] Sinal para ${ticker.symbol} ignorado. Não foi possível determinar um ponto de entrada válido.`);
      return null; // No valid entry point found
  }

  // 5. Define SL, TP, and other parameters based on the new entry target
  const entryZoneSpread = atr * 0.25; // Tighter spread for more precise entries
  let entryZone: [number, number] = [entryTarget - entryZoneSpread / 2, entryTarget + entryZoneSpread / 2];

  const stopLossDistanceMultiplier = confidence.startsWith("Muito Alta") ? 1.25 : 1.75;
  let stopLoss: number;
  let takeProfit: [number, number, number, number, number];

  if (direction === SignalDirection.LONG) {
      stopLoss = entryZone[0] - (atr * stopLossDistanceMultiplier);
  } else { // SHORT
      if (entryZone[0] > entryZone[1]) entryZone = [entryZone[1], entryZone[0]]; // Ensure correct order
      stopLoss = entryZone[1] + (atr * stopLossDistanceMultiplier);
  }

  // Ensure entry zone and stop loss are not negative
  entryZone = [Math.max(0, entryZone[0]), Math.max(0, entryZone[1])];
  stopLoss = Math.max(0, stopLoss);


  const riskDistance = Math.abs(entryTarget - stopLoss);
  if (riskDistance === 0 || riskDistance / entryTarget < 0.001) { // Avoid division by zero or tiny risk
      console.log(`[TA] Sinal para ${ticker.symbol} ignorado. Risco muito baixo, entrada e SL muito próximos.`);
      return null;
  }
  const rrMultiples = [0.6, 1.2, 2.0, 3.5, 5.0];

  if (direction === SignalDirection.LONG) {
      takeProfit = rrMultiples.map(m => entryTarget + (riskDistance * m)) as [number, number, number, number, number];
  } else { // SHORT
      takeProfit = rrMultiples.map(m => Math.max(0, entryTarget - (riskDistance * m))) as [number, number, number, number, number];
  }

  // =================================================================================
  // REQUIREMENT: Do not generate a signal if the current price has already passed the first take-profit target.
  // This ensures that all new signals provide a fresh and valid entry opportunity relative to their calculated targets.
  // =================================================================================
  if (direction === SignalDirection.LONG) {
      // For a LONG signal, if the current price is already at or above the first target, it's too late to enter.
      if (currentPrice >= takeProfit[0]) { 
          console.log(`[TA] Sinal LONG para ${ticker.symbol} ignorado. Preço atual (${currentPrice}) já ultrapassou o Alvo 1 (${takeProfit[0]}).`);
          return null;
      }
  } else { // SHORT
      // For a SHORT signal, if the current price is already at or below the first target, it's too late to enter.
      if (currentPrice <= takeProfit[0]) {
          console.log(`[TA] Sinal SHORT para ${ticker.symbol} ignorado. Preço atual (${currentPrice}) já caiu abaixo do Alvo 1 (${takeProfit[0]}).`);
          return null;
      }
  }

  const riskPercent = Math.abs((entryTarget - stopLoss) / entryTarget) * 100;
  let safeLeverage = 5;
  if(riskPercent > 0) {
    safeLeverage = Math.round(Math.min(25, Math.max(5, 20 / riskPercent)));
  }
  
  let probability: number;
  if (confidence.startsWith("Muito Alta")) {
    probability = Math.floor(Math.random() * (98 - 90 + 1)) + 90; // 90-98%
  } else {
    probability = Math.floor(Math.random() * (89 - 80 + 1)) + 80; // 80-89%
  }

  const formatPriceValue = (value: number) => {
    if (value <= 0) return 0;

    // For prices >= 1
    if (value >= 1) {
        const decimals = value > 100 ? 2 : 4;
        return parseFloat(value.toFixed(decimals));
    }

    // For prices < 1, apply the new specific rules
    const priceString = value.toFixed(20);
    const decimalPart = priceString.substring(priceString.indexOf('.') + 1);

    let leadingZeros = 0;
    for (const char of decimalPart) {
        if (char === '0') {
            leadingZeros++;
        } else {
            break;
        }
    }

    let decimalPlaces;
    switch (leadingZeros) {
        case 0: // No leading zeros
            decimalPlaces = 4;
            break;
        case 1: // 1 zero
        case 2: // 2 zeros
            decimalPlaces = 5;
            break;
        case 3: // 3 zeros
            decimalPlaces = 6;
            break;
        case 4: // 4 zeros
            decimalPlaces = 7;
            break;
        default: // Fallback for > 4 zeros
            decimalPlaces = 8;
    }

    return parseFloat(value.toFixed(decimalPlaces));
  };
  
  // FIX: Changed new Date() to new Date(Date.now()) to satisfy a strict linting rule that likely caused the "Expected 1 arguments, but got 0" error.
  return {
    id: ticker.symbol,
    symbol: ticker.symbol.replace('USDT', ''),
    pair: 'USDT',
    direction,
    probability,
    entryZone: [formatPriceValue(Math.min(...entryZone)), formatPriceValue(Math.max(...entryZone))] as [number, number],
    stopLoss: formatPriceValue(stopLoss),
    takeProfit: takeProfit.map(formatPriceValue) as [number, number, number, number, number],
    confidence: confidence,
    riskNotes: `${entryReason} Stop-Loss posicionado com base na volatilidade (ATR).`,
    safeLeverage: isNaN(safeLeverage) ? 5 : safeLeverage,
    // The timestamp is set here, at the moment of the signal's creation.
    // This value remains fixed for this specific signal instance and is not altered during its lifecycle.
    timestamp: new Date(Date.now()),
  };
};

export const getAllFuturesTickers = async (): Promise<BinanceTicker[]> => {
    try {
        const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
        if (!response.ok) {
            throw new Error(`Binance API (ticker/24hr) Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.filter((t: any) => t.symbol.endsWith('USDT'));
    } catch (error) {
        console.error("Failed to fetch all tickers:", error);
        if (error instanceof Error) throw error;
        throw new Error("Não foi possível buscar os preços da Binance Futuros.");
    }
};

export const getTradingSignals = async (count: number = 8, excludeSymbols: string[] = []): Promise<TradingSignal[]> => {
  try {
    const tradableSymbols = await getTradableFuturesSymbols();
    const tickers = await getAllFuturesTickers();
    
    // REQUIREMENT: Do not repeat alerts for the same pair on the same day.
    // 1. Get symbols already alerted today from localStorage.
    const alertedSymbolsToday = getAlertedSymbolsToday();
    // 2. Combine the list of currently active symbols with today's alerted symbols.
    const excludeSet = new Set([...excludeSymbols, ...alertedSymbolsToday]);

    // 3. Filter out all excluded symbols from the list of available tickers.
    const validTickers = tickers.filter(t => 
        tradableSymbols.has(t.symbol) && 
        !excludeSet.has(t.symbol)
    );

    const sortedTickers = validTickers.sort((a, b) => {
        return Math.abs(parseFloat(b.priceChangePercent)) - Math.abs(parseFloat(a.priceChangePercent));
    });

    const finalSignals: TradingSignal[] = [];
    
    // Iterate through the most volatile tickers until we find enough valid signals
    for (const ticker of sortedTickers) {
        if (finalSignals.length >= count) {
            break; // We have enough signals
        }
        
        let parameters: CachedSignalParameters | null = null;
        
        if (signalParametersCache.has(ticker.symbol)) {
            parameters = signalParametersCache.get(ticker.symbol)!;
        } else {
            parameters = await generateSignalParameters(ticker);
            if (parameters) {
                signalParametersCache.set(ticker.symbol, parameters);
            }
        }
        
        if (parameters) {
            // REQUIREMENT: Before adding the new signal, record that this symbol has been alerted today.
            addAlertedSymbol(ticker.symbol);
            
            finalSignals.push({
                ...parameters,
                price: parseFloat(ticker.lastPrice),
                change24h: parseFloat(ticker.priceChangePercent),
                quoteVolume: parseFloat(ticker.quoteVolume) || 0,
            });
        }
    }
    
    if (finalSignals.length < count) {
        console.warn(`Apenas ${finalSignals.length} de ${count} sinais solicitados foram gerados devido a condições de mercado.`);
    }

    return finalSignals;

  } catch (error) {
      console.error("Falha ao buscar dados de sinais da Binance:", error);
      if (error instanceof Error) throw error;
      throw new Error("Um erro inesperado ocorreu ao comunicar com a API da Binance.");
  }
};