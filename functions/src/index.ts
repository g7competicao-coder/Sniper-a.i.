import * as functions from "firebase-functions";
import * as express from "express";
import * as cors from "cors";
import { getFromCache, setInCache, checkRateLimit } from "./proxy-helpers";

// Initialize express server
const app = express();

// Set up CORS
app.use(cors({ origin: true }));

// Apply rate limiting middleware to all routes
app.use(checkRateLimit);


// --- ROUTES ---

// Proxy for /fapi/v1/ticker/24hr
app.get("/ticker", async (req, res) => {
  const cacheKey = "ticker_24hr";
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cachedData);
  }

  try {
    const response = await fetch("https://fapi.binance.com/fapi/v1/ticker/24hr");
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    setInCache(cacheKey, data);

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (error) {
    functions.logger.error("Failed to fetch from Binance ticker API:", error);
    res.status(502).json({ error: "Failed to fetch data from upstream API" });
  }
});


// Proxy for /fapi/v1/klines
app.get("/klines", async (req, res) => {
  const { symbol, interval, limit } = req.query;

  if (!symbol || !interval) {
    return res.status(400).json({
      error: "Missing required query parameters: symbol, interval",
    });
  }

  const cacheKey = `klines_${symbol}_${interval}_${limit || "default"}`;
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cachedData);
  }

  try {
    const params = new URLSearchParams({
      symbol: symbol as string,
      interval: interval as string,
    });
    if (limit) {
      params.append("limit", limit as string);
    }

    const url = `https://fapi.binance.com/fapi/v1/klines?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    setInCache(cacheKey, data);

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (error) {
    functions.logger.error(`Failed to fetch klines for ${symbol}:`, error);
    res.status(502).json({ error: `Failed to fetch kline data for ${symbol}` });
  }
});


// Proxy for /fapi/v1/exchangeInfo
app.get("/exchangeInfo", async (req, res) => {
  const cacheKey = "exchange_info";
  const cachedData = getFromCache(cacheKey);

  if (cachedData) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cachedData);
  }

  try {
    const response = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo");
    if (!response.ok) {
      return res.status(response.status).json(await response.json());
    }
    const data = await response.json();
    setInCache(cacheKey, data);

    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (error) {
    functions.logger.error("Failed to fetch from Binance exchangeInfo API:", error);
    res.status(502).json({ error: "Failed to fetch exchange info from upstream API" });
  }
});

// Expose Express API as a single Cloud Function
export const api = functions.https.onRequest(app);
