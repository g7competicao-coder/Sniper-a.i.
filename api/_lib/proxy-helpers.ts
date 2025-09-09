// A simple in-memory cache store
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION_MS = 15 * 1000; // 15 seconds

export function getFromCache(key: string) {
  if (cache.has(key)) {
    const entry = cache.get(key)!;
    if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
      return entry.data;
    }
    // Cache expired, remove it
    cache.delete(key);
  }
  return null;
}

export function setInCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}


// A simple in-memory rate limiter store
const ipRequests = new Map<string, { count: number; startTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 45; // 45 requests per minute per IP

export function checkRateLimit(req: any, res: any): boolean {
  // Use a more reliable way to get IP on platforms like Vercel
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  
  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, { count: 1, startTime: Date.now() });
    return true;
  }

  const entry = ipRequests.get(ip)!;
  const now = Date.now();

  if (now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    // Window has reset
    ipRequests.set(ip, { count: 1, startTime: now });
    return true;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({ error: 'Too Many Requests' });
    return false;
  }

  return true;
}
