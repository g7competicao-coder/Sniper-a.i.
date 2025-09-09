import { getFromCache, setInCache, checkRateLimit } from '../_lib/proxy-helpers';

export default async function handler(req, res) {
  if (!checkRateLimit(req, res)) {
    return;
  }

  const { symbol, interval, limit } = req.query;

  if (!symbol || !interval) {
    return res.status(400).json({ error: 'Missing required query parameters: symbol, interval' });
  }

  const cacheKey = `klines_${symbol}_${interval}_${limit || 'default'}`;
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  try {
    const params = new URLSearchParams({ 
      symbol: symbol as string, 
      interval: interval as string 
    });
    if (limit) {
      params.append('limit', limit as string);
    }
    
    const url = `https://fapi.binance.com/fapi/v1/klines?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    
    setInCache(cacheKey, data);
    
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);
  } catch (error) {
    console.error(`Failed to fetch klines for ${symbol}:`, error);
    res.status(502).json({ error: `Failed to fetch kline data for ${symbol}` });
  }
}
