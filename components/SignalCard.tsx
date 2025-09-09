import React, { useState, useEffect, useRef } from 'react';
import { TradingSignal, SignalDirection, CryptoInfo } from '../types';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { InfoIcon } from './icons/InfoIcon';
import { CheckIcon } from './icons/CheckIcon';
import { LeverageIcon } from './icons/LeverageIcon';
import { ShareIcon } from './icons/ShareIcon';
import { RulerIcon } from './icons/RulerIcon';
import { getCryptoInfo } from '../services/geminiService';
import { BrainIcon } from './icons/BrainIcon';
import { SparkleIcon } from './icons/SparkleIcon';
import { ExternalLinkIcon } from './icons/ExternalLinkIcon';
import { validateSignalAnalysis } from '../services/geminiValidationService';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { VolatilityMeter } from './VolatilityMeter';
import { CopyBlocker } from './CopyBlocker';

interface SignalCardProps {
  signal: TradingSignal;
}

const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';

    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
    };

    if (price >= 1) {
        const decimals = price > 100 ? 2 : 4;
        options.minimumFractionDigits = decimals;
        options.maximumFractionDigits = decimals;
    } else if (price > 0) {
        const priceString = price.toFixed(20);
        const decimalPart = priceString.substring(priceString.indexOf('.') + 1);

        let leadingZeros = 0;
        for (const char of decimalPart) {
            if (char === '0') {
                leadingZeros++;
            } else {
                break;
            }
        }

        let decimalPlaces;
        switch (leadingZeros) {
            case 0: // No leading zeros
                decimalPlaces = 4;
                break;
            case 1: // 1 zero
            case 2: // 2 zeros
                decimalPlaces = 5;
                break;
            case 3: // 3 zeros
                decimalPlaces = 6;
                break;
            case 4: // 4 zeros
                decimalPlaces = 7;
                break;
            default: // Fallback for > 4 zeros
                decimalPlaces = 8;
        }
        options.minimumFractionDigits = decimalPlaces;
        options.maximumFractionDigits = decimalPlaces;
    } else { // price is 0 or negative
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    return price.toLocaleString('en-US', options);
};

const formatTargetPrice = (price: number) => {
    if (price <= 0) return '0.00';

    // For prices >= 1, use simpler logic for better readability
    if (price >= 1) {
        const decimals = price > 100 ? 2 : 4;
        return price.toFixed(decimals);
    }

    // For prices < 1, apply the new specific rules based on leading zeros
    const priceString = price.toFixed(20);
    const decimalPart = priceString.substring(priceString.indexOf('.') + 1);

    let leadingZeros = 0;
    for (const char of decimalPart) {
        if (char === '0') {
            leadingZeros++;
        } else {
            break;
        }
    }

    let decimalPlaces;
    switch (leadingZeros) {
        case 0: // No leading zeros
            decimalPlaces = 4;
            break;
        case 1: // 1 zero
        case 2: // 2 zeros
            decimalPlaces = 5;
            break;
        case 3: // 3 zeros
            decimalPlaces = 6;
            break;
        case 4: // 4 zeros
            decimalPlaces = 7;
            break;
        default:
            // Fallback for cases not specified (> 4 zeros)
            decimalPlaces = 8;
    }

    return price.toFixed(decimalPlaces);
};

const formatMarketData = (value: number | string) => {
    if (typeof value === 'string') return value;
    if (value === 0) return 'N/A';

    const numValue = Number(value);
    if (isNaN(numValue)) return String(value);
    
    if (numValue >= 1_000_000_000) {
        return `$${(numValue / 1_000_000_000).toFixed(2)}B`;
    }
    if (numValue >= 1_000_000) {
        return `$${(numValue / 1_000_000).toFixed(2)}M`;
    }
    if (numValue >= 1_000) {
        return `$${(numValue / 1_000).toFixed(2)}K`;
    }
    return value.toString();
};

const InfoRow: React.FC<{ label: string; value: React.ReactNode; valueColor?: string }> = ({ label, value, valueColor = 'text-white' }) => (
    <div className="flex justify-between items-center gap-2">
        <span className="text-gray-400 flex-shrink-0">{label}</span>
        <div className={`font-medium ${valueColor} text-right truncate`}>{value}</div>
    </div>
);

export const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const isLong = signal.direction === SignalDirection.LONG;
  const directionColor = isLong ? 'text-brand-green' : 'text-brand-red';
  const bgColor = isLong ? 'bg-green-500/10' : 'bg-red-500/10';
  const ringColor = isLong ? 'ring-green-500/30' : 'ring-red-500/30';
  
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [isMetricsVisible, setIsMetricsVisible] = useState(false);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [isValidationVisible, setIsValidationVisible] = useState(false);
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [isValidationLoading, setIsValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cryptoInfo, setCryptoInfo] = useState<CryptoInfo | null>(null);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  const visibilityTimer = useRef<number | null>(null);
  
  const probabilityColor =
    signal.probability >= 90 ? 'bg-brand-blue' : signal.probability >= 80 ? 'bg-brand-green' : 'bg-yellow-400';

  useEffect(() => {
    if (visibilityTimer.current) {
      clearTimeout(visibilityTimer.current);
    }

    if (isMetricsVisible || isInfoVisible || isValidationVisible) {
      visibilityTimer.current = window.setTimeout(() => {
        setIsMetricsVisible(false);
        setIsInfoVisible(false);
        setIsValidationVisible(false);
      }, 50000); // 50 seconds
    }

    return () => {
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current);
      }
    };
  }, [isMetricsVisible, isInfoVisible, isValidationVisible]);
  
  const handleShare = async () => {
    const { entryZone, takeProfit, stopLoss, safeLeverage, symbol } = signal;

    const shareContent = `ALERTA SNIPER A.I.
(${symbol}/USDT)
Entrada: ${entryZone[0]} - ${entryZone[1]}

Alvos:
${takeProfit[0]}
${takeProfit[1]}
${takeProfit[2]}
${takeProfit[3]}
${takeProfit[4]}

Stop Loss: ${stopLoss}
Alavancagem: ${safeLeverage}x

bit.ly/GrupoGratuitoTROPA-TOKEN
+ GRUPO TROPA TOKEN +`;

    try {
      if (navigator.share) {
        await navigator.share({ text: shareContent });
      } else {
        await navigator.clipboard.writeText(shareContent);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2500);
      }
    } catch (err) {
      console.error('Failed to share or copy:', err);
      alert('Não foi possível compartilhar ou copiar. Por favor, copie o texto manualmente se necessário.');
    }
  };

  const handleMetricsClick = () => {
    if (isMetricsVisible) {
      setIsMetricsVisible(false);
    } else {
      setIsMetricsVisible(true);
      setIsInfoVisible(false);
      setIsValidationVisible(false);
    }
  };
  
  const handleInfoClick = async () => {
    if (isInfoVisible) {
      setIsInfoVisible(false);
      return;
    }
    
    setIsMetricsVisible(false);
    setIsInfoVisible(true);
    setIsValidationVisible(false);

    if (!cryptoInfo) {
      setIsInfoLoading(true);
      try {
        const info = await getCryptoInfo(signal.symbol);
        setCryptoInfo(info);
      } catch (error) {
        console.error("Failed to fetch crypto info:", error);
        setCryptoInfo({
            symbol: signal.symbol, name: "Erro", ath: 0, atl: 0,
            maxSupply: "N/A", totalSupply: "N/A", marketCap: 0,
            launchDate: "N/A", category: "Não foi possível carregar os dados.",
            website: ""
        });
      } finally {
        setIsInfoLoading(false);
      }
    }
  };
  
  const handleValidationClick = async () => {
    if (isValidationVisible) {
        setIsValidationVisible(false);
        return;
    }

    setIsMetricsVisible(false);
    setIsInfoVisible(false);
    setIsValidationVisible(true);
    
    if (!validationResult) {
        setIsValidationLoading(true);
        setValidationError(null);
        try {
            const result = await validateSignalAnalysis(signal);
            if (result.startsWith("Erro")) {
                setValidationError(result);
                setValidationResult(null);
            } else {
                setValidationResult(result);
            }
        } catch (error) {
            console.error("Gemini validation failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setValidationError(`Falha na validação: ${errorMessage}`);
        } finally {
            setIsValidationLoading(false);
        }
    }
  };

  const entryPriceForMetrics = signal.price;
  
  const lossPercent = isLong 
      ? ((signal.stopLoss - entryPriceForMetrics) / entryPriceForMetrics) * 100 * signal.safeLeverage
      : ((entryPriceForMetrics - signal.stopLoss) / entryPriceForMetrics) * 100 * signal.safeLeverage;
      
  const profitPercents = signal.takeProfit.map(tp => 
      isLong 
          ? ((tp - entryPriceForMetrics) / entryPriceForMetrics) * 100 * signal.safeLeverage
          : ((entryPriceForMetrics - tp) / entryPriceForMetrics) * 100 * signal.safeLeverage
  );

  return (
    <CopyBlocker>
      <div className={`relative ${bgColor} ${ringColor} rounded-xl shadow-lg ring-1 ring-black/5 p-5 flex flex-col justify-between space-y-4 transition-transform duration-300 hover:scale-105 hover:shadow-2xl`}>
        <div>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-400">{signal.symbol}/{signal.pair}</p>
                  <VolatilityMeter 
                    volatility={signal.change24h} 
                    volume={signal.quoteVolume} 
                  />
              </div>
              <p className="text-2xl font-bold text-white">{formatPrice(signal.price)}</p>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-bold ${bgColor} ${directionColor}`}>
              {isLong ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
              <span>{signal.direction}</span>
            </div>
          </div>

          <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Probabilidade</span>
                  <span className="text-sm font-bold text-white">{signal.probability}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div className={`${probabilityColor} h-2.5 rounded-full`} style={{ width: `${signal.probability}%` }}></div>
              </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Zona de Entrada</span>
            <span className="font-mono text-white text-right">{formatTargetPrice(signal.entryZone[0])} - {formatTargetPrice(signal.entryZone[1])}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Stop-Loss</span>
            <span className="font-mono text-brand-red">{formatTargetPrice(signal.stopLoss)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center"><LeverageIcon className="h-4 w-4 mr-1.5 text-yellow-400"/>Alavancagem Segura</span>
            <span className="font-mono text-white font-bold">{signal.safeLeverage}x</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">🎯 Alvo 1</span>
              {signal.tpsHit?.[0] && (
                <span className="text-yellow-400 font-bold text-[11px] leading-tight bg-yellow-400/10 px-1 py-px rounded animate-pulse border border-yellow-400/30">
                  PROTEJA ENTRADA
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-brand-green">
                {signal.tpsHit?.[0] && '🚀 '}{formatTargetPrice(signal.takeProfit[0])}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">🎯 Alvo 2</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-brand-green">
                {signal.tpsHit?.[1] && '🚀 '}{formatTargetPrice(signal.takeProfit[1])}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">🎯 Alvo 3</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-brand-green">
                {signal.tpsHit?.[2] && '🚀 '}{formatTargetPrice(signal.takeProfit[2])}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">🎯 Alvo 4</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-brand-green">
                {signal.tpsHit?.[3] && '🚀 '}{formatTargetPrice(signal.takeProfit[3])}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">🎯 Alvo 5</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-brand-green">
                {signal.tpsHit?.[4] && '🚀 '}{formatTargetPrice(signal.takeProfit[4])}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded-md flex items-start space-x-2">
          <InfoIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
              <p className="font-bold text-gray-200">{signal.confidence}</p>
              <p>{signal.riskNotes}</p>
          </div>
        </div>

        <div className="space-y-2">
            {isMetricsVisible && (
                <div className="text-xs text-gray-300 bg-gray-800 p-3 rounded-lg border border-gray-700/50 space-y-2">
                    <h4 className="font-bold text-sm text-brand-blue text-center mb-2">Métricas de Risco/Retorno</h4>
                    <InfoRow 
                      label="Perda (Stop)" 
                      value={`${lossPercent.toFixed(2)}%`}
                      valueColor="text-brand-red"
                    />
                    {profitPercents.map((profit, index) => {
                        const rrRatio = lossPercent !== 0 ? Math.abs(profit / lossPercent) : 0;
                        return (
                            <InfoRow 
                                key={index}
                                label={`Lucro (Alvo ${index + 1})`}
                                value={
                                  <div className="flex items-baseline justify-end">
                                    <span className="text-brand-green">{`+${profit.toFixed(2)}%`}</span>
                                    <span className="text-xs text-gray-500 ml-1.5">{`(1:${rrRatio.toFixed(1)})`}</span>
                                  </div>
                                }
                            />
                        );
                    })}
                    <p className="text-center text-gray-500 text-[10px] pt-2 mt-2 border-t border-gray-700/50">
                      *Cálculos baseados no preço atual ({formatPrice(signal.price)}) e incluem alavancagem de {signal.safeLeverage}x.
                    </p>
                </div>
            )}
            {isInfoVisible && (
              <div className="text-xs text-gray-300 bg-gray-800 p-3 rounded-lg border border-gray-700/50 space-y-2">
                  <h4 className="font-bold text-sm text-yellow-400 text-center mb-2 flex items-center justify-center gap-2">
                      <SparkleIcon className="h-4 w-4" /> Detalhes do Ativo
                  </h4>
                  {isInfoLoading ? (
                      <p className="text-center animate-pulse text-gray-400">Buscando informações...</p>
                  ) : cryptoInfo ? (
                    <div className="space-y-1.5">
                      <InfoRow label="Nome" value={`${cryptoInfo.name} (${cryptoInfo.symbol})`} />
                      <InfoRow label="Categoria" value={cryptoInfo.category} />
                      {cryptoInfo.website && (
                        <InfoRow 
                          label="Site" 
                          value={
                            <a 
                              href={cryptoInfo.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-brand-blue hover:underline flex items-center justify-end gap-1"
                            >
                                <span className="truncate">{cryptoInfo.website.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                                <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                            </a>
                          } 
                        />
                      )}
                      <InfoRow label="Lançamento" value={cryptoInfo.launchDate} />
                      <InfoRow label="Capitalização" value={formatMarketData(cryptoInfo.marketCap)} />
                      <InfoRow label="Fornecimento Total" value={formatMarketData(cryptoInfo.totalSupply)} />
                      <InfoRow label="Fornecimento Máximo" value={formatMarketData(cryptoInfo.maxSupply)} />
                      <InfoRow label="ATH" value={formatPrice(cryptoInfo.ath)} valueColor="text-brand-green" />
                      <InfoRow label="ATL" value={formatPrice(cryptoInfo.atl)} valueColor="text-brand-red" />
                    </div>
                  ) : null }
              </div>
            )}
            {isValidationVisible && (
                <div className="text-xs text-gray-300 bg-gray-800 p-3 rounded-lg border border-gray-700/50 space-y-2">
                    <h4 className="font-bold text-sm text-purple-400 text-center mb-2 flex items-center justify-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4" /> Validação com Gemini A.I.
                    </h4>
                    {isValidationLoading ? (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
                            <span className="ml-3 text-gray-400">Analisando...</span>
                        </div>
                    ) : validationError ? (
                        <p className="text-center text-brand-red px-2 py-1 bg-red-500/10 rounded">{validationError}</p>
                    ) : validationResult ? (
                        <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                            {validationResult}
                        </div>
                    ) : null}
                </div>
            )}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={handleMetricsClick}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 text-sm"
                >
                    <RulerIcon className="h-4 w-4 text-brand-blue" />
                    <span>{isMetricsVisible ? 'Ocultar' : 'Métrica'}</span>
                </button>
                <button
                    onClick={handleInfoClick}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 text-sm"
                >
                    <BrainIcon className="h-4 w-4 text-yellow-400" />
                    <span>{isInfoVisible ? 'Ocultar' : 'Info'}</span>
                </button>
                <button
                    onClick={handleValidationClick}
                    className="w-full flex items-center justify-center space-x-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium py-1.5 px-3 rounded-lg transition-colors duration-200 text-sm"
                >
                    <ShieldCheckIcon className="h-4 w-4 text-purple-400" />
                    <span>{isValidationVisible ? 'Ocultar' : 'Validar'}</span>
                </button>
            </div>
        </div>

        <div className="pt-4 mt-4 space-y-4 border-t border-gray-700/50">
          <button 
              onClick={handleShare}
              className="w-full flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors duration-200 text-sm"
          >
              {shareStatus === 'copied' ? <CheckIcon className="h-4 w-4 text-brand-green" /> : <ShareIcon className="h-4 w-4" />}
              <span>{shareStatus === 'copied' ? 'Copiado!' : 'Compartilhar Sinal'}</span>
          </button>
          <p className="text-center text-xs text-gray-500 !mt-3">
              Lançado em: {signal.timestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </CopyBlocker>
  );
};