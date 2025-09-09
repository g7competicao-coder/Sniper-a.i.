import React from 'react';

interface PieChartProps {
  wins: number;
  losses: number;
  size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ wins, losses, size = 80 }) => {
  const total = wins + losses;
  if (total === 0) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 36 36" className="w-full h-full">
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            className="stroke-current text-gray-700"
            strokeWidth="3.8"
            fill="transparent"
            aria-label="No data available for chart"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-400">N/A</span>
        </div>
      </div>
    );
  }

  const winPercentage = (wins / total) * 100;

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Pie chart showing a win rate of ${winPercentage.toFixed(0)}%`}>
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {/* Background circle (losses) */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          className="stroke-current text-brand-red"
          strokeWidth="3.8"
          fill="transparent"
        />
        {/* Foreground circle (wins) */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          className="stroke-current text-brand-green"
          strokeWidth="3.8"
          fill="transparent"
          strokeDasharray={`${winPercentage}, 100`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{winPercentage.toFixed(0)}%</span>
      </div>
    </div>
  );
};
