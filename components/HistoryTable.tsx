import React from 'react';
import { HistoricalSignal, SignalDirection, SignalStatus, HistoryFilter } from '../types';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';

// A small component for the summary cards
const StatCard: React.FC<{ title: string; value: string; valueColor?: string; helpText?: string }> = ({ title, value, valueColor = 'text-white', helpText }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col justify-between">
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
        {helpText && <p className="text-xs text-gray-500 mt-2">{helpText}</p>}
    </div>
);


// The new HistoryView component
interface HistoryViewProps {
  report: {
    summary: {
      totalPnl: number;
      winRate: number;
      totalTrades: number;
      bestTrade: HistoricalSignal | null;
    };
    groupedByDay: Record<string, {
      signals: HistoricalSignal[];
      dailyPnl: number;
      wins: number;
      losses: number;
    }>;
  };
  currentFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ report, currentFilter, onFilterChange }) => {
    const { summary, groupedByDay } = report;
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const hasData = summary.totalTrades > 0;

    const filters: { key: HistoryFilter, label: string }[] = [
        { key: 'day', label: 'Hoje'},
        { key: 'month', label: 'Este Mês'},
        { key: 'year', label: 'Este Ano'},
        { key: 'all', label: 'Tudo'},
    ];
    
    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-6">Relatório de Performance</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard 
                    title="Resultado Total"
                    value={`${summary.totalPnl.toFixed(2)}%`}
                    valueColor={summary.totalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}
                />
                <StatCard 
                    title="Taxa de Acerto"
                    value={`${summary.winRate.toFixed(1)}%`}
                />
                <StatCard 
                    title="Total de Operações"
                    value={summary.totalTrades.toString()}
                />
                <StatCard 
                    title="Melhor Operação"
                    value={summary.bestTrade ? `${summary.bestTrade.symbol}` : 'N/A'}
                    helpText={summary.bestTrade ? `${summary.bestTrade.resultPercent.toFixed(2)}%` : ''}
                    valueColor={summary.bestTrade ? 'text-brand-blue' : 'text-white'}
                />
            </div>

            {/* Filter Buttons */}
             <div className="mb-6 flex items-center space-x-2">
                {filters.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => onFilterChange(key)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                            currentFilter === key 
                            ? 'bg-brand-blue text-white' 
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>


            {/* History Table */}
            {!hasData ? (
                <div className="text-center py-10 px-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">Nenhum histórico de sinal encontrado para o período selecionado.</p>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Par</th>
                                    <th scope="col" className="px-6 py-3">Data/Hora</th>
                                    <th scope="col" className="px-6 py-3">Direção</th>
                                    <th scope="col" className="px-6 py-3 text-center">Alavancagem</th>
                                    <th scope="col" className="px-6 py-3 text-right">Resultado</th>
                                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                            {sortedDays.map(date => {
                                const dayData = groupedByDay[date];
                                const isDayProfitable = dayData.dailyPnl >= 0;

                                return (
                                    <React.Fragment key={date}>
                                         <tr className="bg-gray-900/50">
                                            <td colSpan={6} className="px-6 py-2 text-center font-bold text-white tracking-wider">
                                                {date}
                                            </td>
                                        </tr>
                                        {dayData.signals.map(signal => {
                                            const isLong = signal.direction === SignalDirection.LONG;
                                            const isWin = signal.status === SignalStatus.WIN;
                                            const resultColor = isWin ? 'text-brand-green' : 'text-brand-red';

                                            return (
                                                <tr key={signal.id + signal.timestamp.toISOString()} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 font-bold text-white">{signal.symbol}/{signal.pair}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{signal.timestamp.toLocaleTimeString('pt-BR')}</td>
                                                    <td className="px-6 py-4">
                                                        <div className={`flex items-center space-x-2 ${isLong ? 'text-brand-green' : 'text-brand-red'}`}>
                                                            {isLong ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                                                            <span>{signal.direction}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-mono">{signal.safeLeverage}x</td>
                                                    <td className={`px-6 py-4 font-mono font-semibold text-right ${resultColor}`}>
                                                        {signal.resultPercent.toFixed(2)}%
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${isWin ? 'bg-green-500/10 text-brand-green' : 'bg-red-500/10 text-brand-red'}`}>
                                                            {isWin ? 'VITÓRIA' : 'DERROTA'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Daily Summary Row */}
                                        <tr className="bg-gray-900 font-bold">
                                            <td colSpan={3} className="px-6 py-3 text-gray-400">
                                                Resumo do dia: {dayData.wins} Vitórias / {dayData.losses} Derrotas
                                            </td>
                                            <td colSpan={2} className={`px-6 py-3 text-right ${isDayProfitable ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {dayData.dailyPnl.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-3 text-center text-xs ${isDayProfitable ? 'text-brand-green' : 'text-brand-red'}`}>
                                                {isDayProfitable ? 'DIA LUCRATIVO' : 'DIA COM PREJUÍZO'}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
