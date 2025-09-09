// Este serviço foi refatorado para usar a API da CoinGecko para busca de dados mais rápida e confiável.
import { CryptoInfo } from '../types';

// Tipo para a resposta da API CoinGecko /coins/list
interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

// Chave do sessionStorage para o mapa de símbolo para id
const COINGECKO_ID_MAP_KEY = 'coingeckoIdMap';

/**
 * Busca a lista de todas as moedas da CoinGecko e cria um mapa de símbolo para id.
 * O mapa é armazenado em cache no sessionStorage para evitar chamadas repetidas à API.
 * @returns Uma promessa que resolve para um Map<string, string> de símbolo -> id.
 */
const getCoingeckoIdMap = async (): Promise<Map<string, string>> => {
  const cachedMapData = sessionStorage.getItem(COINGECKO_ID_MAP_KEY);
  if (cachedMapData) {
    try {
      // O mapa é armazenado como um array de pares [chave, valor] em JSON
      return new Map(JSON.parse(cachedMapData));
    } catch (e) {
      console.error("Falha ao analisar o mapa de IDs da CoinGecko do cache", e);
    }
  }

  try {
    console.log("Buscando lista de moedas da CoinGecko para mapeamento de IDs...");
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list');
    if (!response.ok) {
      throw new Error(`Erro na API da CoinGecko (/coins/list): ${response.status}`);
    }
    const coins: CoinGeckoCoin[] = await response.json();

    const idMap = new Map<string, string>();
    for (const coin of coins) {
      // Armazena o símbolo em minúsculas para correspondência insensível a maiúsculas/minúsculas.
      // Prioriza a primeira entrada para símbolos duplicados.
      if (!idMap.has(coin.symbol.toLowerCase())) {
          idMap.set(coin.symbol.toLowerCase(), coin.id);
      }
    }
    
    // Armazena o mapa em cache convertendo-o em um array para serialização JSON
    sessionStorage.setItem(COINGECKO_ID_MAP_KEY, JSON.stringify(Array.from(idMap.entries())));
    return idMap;
  } catch (error) {
    console.error("Falha ao buscar ou processar a lista de moedas da CoinGecko:", error);
    throw new Error("Não foi possível carregar a lista de moedas da CoinGecko.");
  }
};


/**
 * Busca informações detalhadas da criptomoeda na API da CoinGecko.
 * Esta implementação é mais rápida e confiável do que usar um modelo de IA generativa.
 * @param symbol O símbolo do ticker (ex: "BTC").
 * @returns Uma promessa que resolve para um objeto CryptoInfo.
 */
const getCryptoInfoWithCoinGecko = async (symbol: string): Promise<CryptoInfo> => {
  const idMap = await getCoingeckoIdMap();
  const coinId = idMap.get(symbol.toLowerCase());

  if (!coinId) {
    throw new Error(`Não foi possível encontrar o ativo "${symbol}" na base de dados da CoinGecko.`);
  }
  
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    if (!response.ok) {
      throw new Error(`Erro na API da CoinGecko para ${coinId}: ${response.status}`);
    }
    const data = await response.json();
    
    const formatSupply = (value: number | null): string => {
        if (value === null || value === undefined) return "N/A";
        return new Intl.NumberFormat('en-US').format(value);
    };

    const cryptoInfo: CryptoInfo = {
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      ath: data.market_data?.ath?.usd ?? 0,
      atl: data.market_data?.atl?.usd ?? 0,
      maxSupply: formatSupply(data.market_data?.max_supply),
      totalSupply: formatSupply(data.market_data?.total_supply),
      marketCap: data.market_data?.market_cap?.usd ?? 0,
      launchDate: data.genesis_date ?? "N/A",
      category: data.categories?.filter((c: string | null) => c).join(', ') || "N/A",
      website: data.links?.homepage?.find((h: string | null) => h) ?? ""
    };
    
    return cryptoInfo;

  } catch (error) {
    console.error(`Erro ao buscar informações de cripto para ${symbol} da API da CoinGecko:`, error);
    throw new Error(`Não foi possível buscar os detalhes para ${symbol} na CoinGecko.`);
  }
};

/**
 * Função pública para obter informações de cripto, com cache em nível de sessão.
 * Este serviço agora usa a API da CoinGecko para buscar dados.
 * @param symbol O símbolo do ticker da criptomoeda.
 * @returns Uma promessa que resolve para o objeto CryptoInfo.
 */
export const getCryptoInfo = async (symbol: string): Promise<CryptoInfo> => {
  console.log(`Buscando informações para: ${symbol} via API da CoinGecko`);
  const cacheKey = `crypto_info_coingecko_${symbol.toLowerCase()}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Falha ao analisar informações de cripto do cache", e);
    }
  }

  try {
    const info = await getCryptoInfoWithCoinGecko(symbol);
    sessionStorage.setItem(cacheKey, JSON.stringify(info));
    return info;
  } catch(error) {
    console.error(`Erro em getCryptoInfo para ${symbol}:`, error);
    throw error;
  }
};
