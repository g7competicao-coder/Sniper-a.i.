const DAILY_ALERTS_KEY = 'cryptoDailyAlertedSymbols';

interface DailyAlerts {
  date: string; // YYYY-MM-DD in UTC
  symbols: string[];
}

/**
 * Gets today's date as a YYYY-MM-DD string in UTC.
 * Using UTC prevents issues with client timezones, ensuring the list resets at the same moment for everyone.
 * @returns Today's date string.
 */
const getTodayUTCString = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Retrieves the list of symbols that have already generated an alert today.
 * If the stored date is not today, it automatically clears the old list.
 * @returns An array of symbol strings (e.g., ['BTCUSDT', 'ETHUSDT']).
 */
export const getAlertedSymbolsToday = (): string[] => {
  try {
    const storedData = localStorage.getItem(DAILY_ALERTS_KEY);
    if (!storedData) {
      return [];
    }

    const data: DailyAlerts = JSON.parse(storedData);
    const todayStr = getTodayUTCString();

    if (data.date === todayStr) {
      return data.symbols || [];
    } else {
      // Data is from a previous day, clear it.
      localStorage.removeItem(DAILY_ALERTS_KEY);
      return [];
    }
  } catch (error) {
    console.error("Failed to get daily alerted symbols from localStorage:", error);
    // On error, clear the potentially corrupt data to self-heal.
    localStorage.removeItem(DAILY_ALERTS_KEY);
    return [];
  }
};

/**
 * Adds a symbol to the list of symbols that have been alerted today.
 * It handles creating the list if it's the first symbol of the day.
 * @param symbol The symbol string (e.g., 'BTCUSDT') to add.
 */
export const addAlertedSymbol = (symbol: string): void => {
  try {
    const todayStr = getTodayUTCString();
    // getAlertedSymbolsToday also handles clearing the list if the day has changed.
    const currentSymbols = getAlertedSymbolsToday();

    if (currentSymbols.includes(symbol)) {
      return; // Symbol already recorded for today.
    }

    const newSymbols = [...currentSymbols, symbol];
    const newData: DailyAlerts = {
      date: todayStr,
      symbols: newSymbols,
    };

    localStorage.setItem(DAILY_ALERTS_KEY, JSON.stringify(newData));
  } catch (error) {
    console.error("Failed to add alerted symbol to localStorage:", error);
  }
};
