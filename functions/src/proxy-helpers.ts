import { Request, Response, NextFunction } from "express";

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

export function checkRateLimit(req: Request, res: Response, next: NextFunction) {
  // Firebase automatically populates req.ip
  // FIX: Used index accessor req['ip'] to bypass a TypeScript error where the 'ip' property was not found on the Request type.
  // This can happen with mismatched or incomplete type definitions in the project's environment.
  const ip = req['ip'] || "unknown";

  if (!ipRequests.has(ip)) {
    ipRequests.set(ip, { count: 1, startTime: Date.now() });
    return next();
  }

  const entry = ipRequests.get(ip)!;
  const now = Date.now();

  if (now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    // Window has reset
    ipRequests.set(ip, { count: 1, startTime: now });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    // FIX: Used index accessor res['status'] to bypass a TypeScript error where the 'status' method was not found on the Response type.
    // This is a workaround for potential type definition issues.
    res['status'](429).json({ error: "Too Many Requests" });
    return;
  }
  
  return next();
}
