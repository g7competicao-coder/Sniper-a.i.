import { MarketSentiment } from '../types';
import { getAllFuturesTickers } from './mockSignalService';

// The ticker type from Binance API, we only need symbol and quoteVolume for this service
interface Ticker {
  symbol: string;
  quoteVolume: string;
}

// Binance kline data structure: [open_time, open, high, low, close, volume, ...]
type Kline = [number, string, string, string, string, string];

export const getMarketSentiment = async (): Promise<MarketSentiment> => {
  try {
    const allTickers: Ticker[] = await getAllFuturesTickers();

    // Filter for USDT pairs, exclude BTC and ETH, and sort by quote volume to get top altcoins
    const topAltcoins = allTickers
      .filter(t => t.symbol.endsWith('USDT') && t.symbol !== 'BTCUSDT' && t.symbol !== 'ETHUSDT')
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 30); // Analyze top 30 altcoins by volume

    if (topAltcoins.length === 0) {
      console.warn("No altcoins found to analyze for market sentiment.");
      return 'NEUTRAL';
    }

    const klinePromises = topAltcoins.map(ticker =>
      fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${ticker.symbol}&interval=15m&limit=4`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch kline for ${ticker.symbol}`);
          return res.json();
        })
        .then(data => data as Kline[]) // We now get an array of candles
    );
    
    const klineResults = await Promise.allSettled(klinePromises);

    let bullishCount = 0;
    let bearishCount = 0;

    klineResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        const klines = result.value;
        const firstCandle = klines[0];
        const lastCandle = klines[klines.length - 1];

        const openStr = firstCandle[1]; // Open price of the first candle in the period
        const closeStr = lastCandle[4]; // Close price of the last candle in the period
        const open = parseFloat(openStr);
        const close = parseFloat(closeStr);

        if (close > open) {
          bullishCount++;
        } else if (close < open) {
          bearishCount++;
        }
      } else if (result.status === 'rejected') {
        // console.error("Kline fetch failed:", result.reason); // Silently ignore failed fetches for single symbols
      }
    });

    if (bullishCount > bearishCount) {
      return 'BULLISH';
    } else if (bearishCount > bullishCount) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }

  } catch (error) {
    console.error("Failed to get market sentiment:", error);
    return 'NEUTRAL'; // Return neutral on error to avoid showing wrong sentiment
  }
};