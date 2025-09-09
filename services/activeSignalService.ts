import { TradingSignal } from '../types';

const ACTIVE_SIGNALS_KEY = 'cryptoActiveSignals';

/**
 * Retrieves the active signals from localStorage.
 * @returns An array of TradingSignal objects.
 */
export const getActiveSignals = (): TradingSignal[] => {
  try {
    const signalsJson = localStorage.getItem(ACTIVE_SIGNALS_KEY);
    if (!signalsJson) {
      return [];
    }
    // Reviver function to correctly parse date strings back into Date objects
    return JSON.parse(signalsJson, (key, value) => {
      if (key === 'timestamp' && typeof value === 'string') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    console.error("Failed to get active signals from localStorage:", error);
    return [];
  }
};

/**
 * Saves the active signals to localStorage.
 * @param signals An array of TradingSignal objects to save.
 */
export const saveActiveSignals = (signals: TradingSignal[]): void => {
  try {
    const signalsJson = JSON.stringify(signals);
    localStorage.setItem(ACTIVE_SIGNALS_KEY, signalsJson);
  } catch (error) {
    console.error("Failed to save active signals to localStorage:", error);
  }
};