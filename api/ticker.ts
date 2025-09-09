import { getFromCache, setInCache, checkRateLimit } from './_lib/proxy-helpers';

export default async function handler(req, res) {
  if (!checkRateLimit(req, res)) {
    return;
  }

  const cacheKey = 'ticker_24hr';
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    if (!response.ok) {
      // Pass through the status from Binance if it's an error
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    
    setInCache(cacheKey, data);
    
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch from Binance ticker API:', error);
    res.status(502).json({ error: 'Failed to fetch data from upstream API' });
  }
}
