import React, { useState, useRef, useEffect } from 'react';
import { ListIcon } from './icons/ListIcon';
import { MarketSentiment } from '../types';
import { InfoIcon } from './icons/InfoIcon';

interface HeaderProps {
  lastUpdated: Date;
  currentView: 'signals' | 'history';
  onToggleView: () => void;
  marketSentiment: MarketSentiment;
  bitcoinData: { price: number; change: number } | null;
  usdtBrlData: { price: number; change: number } | null;
}

const SentimentIndicator: React.FC<{ sentiment: MarketSentiment }> = ({ sentiment }) => {
  switch (sentiment) {
    case 'BULLISH':
      return (
        <div title="Sentimento do Mercado: Alta" className="flex items-center space-x-2">
          <span className="text-base">🟢</span>
          <span className="text-sm font-medium text-gray-200 hidden sm:block">Mercado Comprador</span>
        </div>
      );
    case 'BEARISH':
      return (
        <div title="Sentimento do Mercado: Baixa" className="flex items-center space-x-2">
          <span className="text-base">🔴</span>
          <span className="text-sm font-medium text-gray-200 hidden sm:block">Mercado Vendedor</span>
        </div>
      );
    case 'NEUTRAL':
    default:
      return (
        <div title="Sentimento do Mercado: Neutro" className="flex items-center space-x-2">
          <span className="text-base">🟡</span>
          <span className="text-sm font-medium text-gray-200 hidden sm:block">Mercado Lateralizado</span>
        </div>
      );
  }
};

export const Header: React.FC<HeaderProps> = ({ lastUpdated, currentView, onToggleView, marketSentiment, bitcoinData, usdtBrlData }) => {
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setIsInfoVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isInfoVisible) {
      const timer = setTimeout(() => {
        setIsInfoVisible(false);
      }, 10000); // Auto-hide after 10 seconds

      return () => clearTimeout(timer); // Cleanup timer on unmount or if closed manually
    }
  }, [isInfoVisible]);


  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <svg
              className="h-8 w-8"
              viewBox="0 0 50 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Black Circle */}
              <circle cx="25" cy="25" r="24" stroke="black" strokeWidth="2" />
              
              {/* Inner Red Scope */}
              <circle cx="25" cy="25" r="20" stroke="#FF4D4D" strokeWidth="2" />
              <line x1="25" y1="5" x2="25" y2="12" stroke="#FF4D4D" strokeWidth="3" />
              <line x1="25" y1="38" x2="25" y2="45" stroke="#FF4D4D" strokeWidth="3" />
              <line x1="5" y1="25" x2="12" y2="25" stroke="#FF4D4D" strokeWidth="3" />
              <line x1="38" y1="25" x2="45" y2="25" stroke="#FF4D4D" strokeWidth="3" />
              
              {/* Candlesticks */}
              <g strokeLinecap="round">
                  {/* Wick, then Body */}
                  {/* 1 */}
                  <line x1="15" y1="31" x2="15" y2="34" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="14" y="32" width="2" height="1.5" fill="#00FFA3" />
                  {/* 2 */}
                  <line x1="18" y1="28" x2="18" y2="32" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="17" y="29" width="2" height="2.5" fill="#00FFA3" />
                  {/* 3 */}
                  <line x1="21" y1="26" x2="21" y2="30" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="20" y="27" width="2" height="2.5" fill="#00FFA3" />
                  {/* 4 - RED */}
                  <line x1="25" y1="23" x2="25" y2="31" stroke="#FF4D4D" strokeWidth="1.5" />
                  <rect x="24" y="24" width="2" height="6" fill="#FF4D4D" />
                  {/* 5 */}
                  <line x1="29" y1="22" x2="29" y2="27" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="28" y="23" width="2" height="3" fill="#00FFA3" />
                  {/* 6 */}
                  <line x1="32" y1="19" x2="32" y2="25" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="31" y="20" width="2" height="4" fill="#00FFA3" />
                  {/* 7 */}
                  <line x1="35" y1="16" x2="35" y2="23" stroke="#00FFA3" strokeWidth="1.5" />
                  <rect x="34" y="17" width="2" height="5" fill="#00FFA3" />
              </g>
            </svg>
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white tracking-tight">
                SNIPER <span className="text-brand-blue">A.I.</span>
              </h1>
              <div className="flex items-center space-x-4">
                {bitcoinData && (
                  <div className="flex items-center space-x-2 text-sm" title="Preço do Bitcoin (BTC/USDT)">
                      <span className="font-bold text-gray-200 hidden sm:block">BTC</span>
                      <span className="font-medium text-white">${bitcoinData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className={`font-semibold ${bitcoinData.change >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {bitcoinData.change >= 0 ? '▲' : '▼'} {Math.abs(bitcoinData.change).toFixed(2)}%
                      </span>
                  </div>
                )}
                {usdtBrlData && (
                  <>
                    <div className="w-px h-6 bg-gray-700 hidden sm:block"></div>
                    <div className="flex items-center space-x-2 text-sm" title="Cotação Dólar (USDT/BRL)">
                      <span className="font-bold text-gray-200 hidden sm:block">Dólar</span>
                      <span className="font-medium text-white">
                          {usdtBrlData.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className={`font-semibold ${usdtBrlData.change >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                          {usdtBrlData.change >= 0 ? '▲' : '▼'} {Math.abs(usdtBrlData.change).toFixed(2)}%
                      </span>
                    </div>
                  </>
                )}
                <div className="w-px h-6 bg-gray-700 hidden sm:block"></div>
                <SentimentIndicator sentiment={marketSentiment} />
                <div className="relative" ref={infoRef}>
                  <button
                    onClick={() => setIsInfoVisible(prev => !prev)}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Informações sobre o sentimento do mercado"
                  >
                    <InfoIcon className="h-5 w-5" />
                  </button>
                  {isInfoVisible && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-max max-w-[240px] bg-gray-700 text-gray-200 text-xs rounded-lg shadow-lg p-3 z-20">
                      Esta análise de sentimento é baseada na movimentação das 30 principais altcoins na última hora.
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-r-4 border-r-gray-700"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400 hidden sm:block">
              Última atualização: {lastUpdated.toLocaleTimeString('pt-BR')}
            </div>
            {/* FIX: The onClick handler was simplified by removing an unnecessary arrow function wrapper. */}
            <button
              onClick={onToggleView}
              className="hidden md:flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <ListIcon className="h-5 w-5" />
              <span>{currentView === 'signals' ? 'Ver Histórico' : 'Sinais ao Vivo'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
