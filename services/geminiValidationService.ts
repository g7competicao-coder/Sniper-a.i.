import { GoogleGenAI } from "@google/genai";
import { TradingSignal } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY environment variable not set. Gemini API will not work.");
}
const ai = new GoogleGenAI({ apiKey: apiKey! });

/**
 * Formats a price for display in the AI prompt, adjusting precision based on magnitude.
 * @param price The price to format.
 * @returns A formatted string representation of the price.
 */
const formatPriceForPrompt = (price: number): string => {
    if (price === 0) return "0";
    // For very small numbers, show significant digits to avoid long strings of zeros.
    if (price < 0.0001) return price.toPrecision(4);
    // For small numbers, show more decimal places.
    if (price < 1) return price.toFixed(6);
    // For mid-range numbers.
    if (price < 1000) return price.toFixed(4);
    // For large numbers like BTC.
    return price.toFixed(2);
};


/**
 * Uses Gemini to validate a trading signal and provide a second opinion.
 * @param signal The trading signal to validate.
 * @returns A promise that resolves to a string with Gemini's analysis.
 */
export const validateSignalAnalysis = async (signal: TradingSignal): Promise<string> => {
  if (!apiKey) {
    return "Erro de Configuração: A chave da API do Gemini não foi definida.";
  }
  
  try {
    const prompt = `
      Você é um analista de trading sênior. Sua tarefa é fornecer uma segunda opinião CRÍTICA e ACIONÁVEL sobre o sinal de trade abaixo.

      **Dados do Sinal:**
      - Ativo: ${signal.symbol}/USDT (${signal.direction})
      - Preço Atual: ${formatPriceForPrompt(signal.price)}
      - Análise da IA Primária: "${signal.confidence}. ${signal.riskNotes}"
      - Zona de Entrada: ${formatPriceForPrompt(signal.entryZone[0])} - ${formatPriceForPrompt(signal.entryZone[1])}
      - Alvos: ${signal.takeProfit.map(tp => formatPriceForPrompt(tp)).join(', ')}
      - Stop Loss: ${formatPriceForPrompt(signal.stopLoss)}
      - Alavancagem Sugerida: ${signal.safeLeverage}x
      - Volume (24h): $${signal.quoteVolume?.toLocaleString('en-US', { maximumFractionDigits: 0 }) || 'N/A'}

      **Sua Tarefa (Formato Obrigatório):**
      1.  **Resumo da Análise:** Um parágrafo conciso (2-3 linhas) avaliando a qualidade geral do sinal (risco/retorno, volume, premissa).
      2.  **Recomendações Estratégicas:** Em uma nova linha, comece com "**Recomendações Estratégicas:**". Analise o **Preço Atual** vs **Zona de Entrada** e **Stop Loss**. Forneça UMA das seguintes recomendações:
          - **D.C.A. (Dollar-Cost Averaging):** Se o preço está longe da entrada e perto do stop, sugira 2 ou 3 entradas parciais com os preços exatos.
          - **Ajuste de Stop:** Se o stop loss parece arriscado, sugira um novo valor numérico exato.
          - **Manter Plano:** Se o plano original for sólido, afirme para manter.
      3.  **Nota de Confiança:** Em uma nova linha, comece com "**Nota de Confiança:**" seguido de uma nota de 0.0 a 10.0 para o plano (original ou ajustado).
    `;


    const response = await ai.models.generateContent({
        // FIX: Per coding guidelines, updated deprecated model 'gemini-1.5-flash' to the recommended 'gemini-2.5-flash' for general text tasks.
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
        },
    });
    
    return response.text;
  } catch (error) {
    console.error("Erro na validação com Gemini:", error);
    if (error instanceof Error) {
        if (error.message.includes('API key not valid')) {
            return "Erro: A chave da API do Gemini é inválida ou expirou.";
        }
        return `Erro ao contatar a A.I. de validação. Por favor, tente novamente mais tarde.`;
    }
    return "Ocorreu um erro desconhecido durante a validação.";
  }
};