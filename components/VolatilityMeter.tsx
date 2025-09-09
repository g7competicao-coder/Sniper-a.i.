import React from 'react';

interface VolatilityMeterProps {
  volatility: number;
  volume: number | undefined;
}

const getLevel = (value: number, thresholds: number[]): number => {
  if (value < thresholds[0]) return 1;
  if (value < thresholds[1]) return 2;
  if (value < thresholds[2]) return 3;
  if (value < thresholds[3]) return 4;
  return 5;
};

export const VolatilityMeter: React.FC<VolatilityMeterProps> = ({ volatility, volume }) => {
  if (typeof volume !== 'number') {
    return null; // Don't render if volume data is not available
  }

  // Volatility is based on the absolute 24h percentage change
  const volatilityLevel = getLevel(Math.abs(volatility), [2, 5, 10, 20]);

  // Volume is based on the 24h quote volume in USDT
  const volumeLevel = getLevel(volume, [10_000_000, 50_000_000, 200_000_000, 1_000_000_000]);

  const finalLevel = Math.max(1, Math.round((volatilityLevel + volumeLevel) / 2));

  const levelColors = [
    'bg-gray-600',   // Off state
    'bg-cyan-500',   // Level 1 (Muito Baixo)
    'bg-green-500',  // Level 2 (Baixo)
    'bg-yellow-400', // Level 3 (Moderado)
    'bg-orange-500', // Level 4 (Alto)
    'bg-red-600',    // Level 5 (Extremo)
  ];

  const levelLabels = [
    'Desconhecido',
    'Muito Baixo',
    'Baixo',
    'Moderado',
    'Alto',
    'Extremo',
  ];
  
  const formattedVolume = volume > 1_000_000_000
    ? `${(volume / 1_000_000_000).toFixed(2)}B`
    : `${(volume / 1_000_000).toFixed(2)}M`;

  const tooltipText = `Nível de Atividade: ${levelLabels[finalLevel]}\nVolatilidade (24h): ${Math.abs(volatility).toFixed(2)}%\nVolume (24h): $${formattedVolume}`;

  const barHeights = ['h-2', 'h-2.5', 'h-3', 'h-3.5', 'h-4'];

  return (
    <div className="flex items-end space-x-0.5" title={tooltipText}>
      {Array.from({ length: 5 }).map((_, index) => {
        const barLevel = index + 1;
        const color = barLevel <= finalLevel ? levelColors[finalLevel] : levelColors[0];
        
        return (
          <div
            key={index}
            className={`w-1 rounded-sm transition-colors duration-300 ${color} ${barHeights[index]}`}
          />
        );
      })}
    </div>
  );
};
