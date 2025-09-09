import { HistoricalSignal } from '../types';

const HISTORY_KEY = 'cryptoSignalHistory';

/**
 * Retrieves the signal history from localStorage.
 * @returns An array of HistoricalSignal objects.
 */
export const getHistory = (): HistoricalSignal[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (!historyJson) {
      return [];
    }
    // Reviver function to correctly parse date strings back into Date objects
    return JSON.parse(historyJson, (key, value) => {
      if ((key === 'timestamp' || key === 'resolvedAt') && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    console.error("Failed to get history from localStorage:", error);
    return [];
  }
};

/**
 * Saves the signal history to localStorage.
 * @param history An array of HistoricalSignal objects to save.
 */
export const saveHistory = (history: HistoricalSignal[]): void => {
  try {
    const historyJson = JSON.stringify(history);
    localStorage.setItem(HISTORY_KEY, historyJson);
  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
};