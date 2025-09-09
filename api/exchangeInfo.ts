import { getFromCache, setInCache, checkRateLimit } from './_lib/proxy-helpers';

// Note: Exchange info changes infrequently. In a real-world app, a much longer cache duration
// (e.g., 1 hour) would be more appropriate for this specific endpoint.
// Sticking to the 15s requirement for consistency with the user request.
const CACHE_KEY = 'exchange_info';

export default async function handler(req, res) {
  if (!checkRateLimit(req, res)) {
    return;
  }

  const cachedData = getFromCache(CACHE_KEY);

  if (cachedData) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json(cachedData);
  }

  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    
    setInCache(CACHE_KEY, data);
    
    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);
  } catch (error) {
    console.error('Failed to fetch from Binance exchangeInfo API:', error);
    res.status(502).json({ error: 'Failed to fetch exchange info from upstream API' });
  }
}
