import React, { useState, useEffect } from 'react';
import { HistoricalSignal, SignalDirection, SignalStatus, HistoryFilter } from '../types';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { PieChart } from './PieChart';

const INITIAL_DAYS_TO_SHOW = 3;
const DAYS_TO_LOAD_INCREMENT = 5;


// A small component for the summary cards
const StatCard: React.FC<{ title: string; value: string; valueColor?: string; helpText?: string }> = ({ title, value, valueColor = 'text-white', helpText }) => (
    <div className="bg-gray-800 p-4 rounded-lg flex flex-col justify-between text-center sm:text-left">
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
        {helpText && <p className="text-xs text-gray-500 mt-2">{helpText}</p>}
    </div>
);


// PERF: Memoized component for a single signal card (mobile view) to prevent unnecessary re-renders.
const MemoizedSignalCard: React.FC<{ signal: HistoricalSignal }> = React.memo(({ signal }) => {
    const isLong = signal.direction === SignalDirection.LONG;
    const isWin = signal.status === SignalStatus.WIN;
    const isLoss = signal.status === SignalStatus.LOSS;
    const isPartial = signal.status === SignalStatus.PARTIAL_WIN;
    const resultColor = isWin ? 'text-brand-green' : isLoss ? 'text-brand-red' : 'text-gray-300';
    
    let statusText, statusBgColor, statusTextColor;
    if (isWin) {
        statusText = 'VITÓRIA'; statusBgColor = 'bg-green-500/10'; statusTextColor = 'text-brand-green';
    } else if (isLoss) {
        statusText = 'DERROTA'; statusBgColor = 'bg-red-500/10'; statusTextColor = 'text-brand-red';
    } else {
        statusText = 'ATIVO'; statusBgColor = 'bg-blue-500/10'; statusTextColor = 'text-brand-blue';
    }
    const hitTargets = signal.tpsHit?.filter(Boolean).length || 0;

    return (
        <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg text-white">{signal.symbol}/{signal.pair}</p>
                    <p className="text-xs text-gray-400">Início: {signal.timestamp.toLocaleTimeString('pt-BR')}</p>
                    <p className="text-xs text-gray-400">Atualizado: {signal.resolvedAt.toLocaleTimeString('pt-BR')}</p>
                </div>
                <div className="text-right">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusBgColor} ${statusTextColor}`}>
                        {statusText}
                    </span>
                    {(isPartial || isWin) && hitTargets > 0 && 
                        <p className="text-xs text-gray-400 mt-1">{hitTargets}/5 Alvos</p>
                    }
                </div>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Resultado</span>
                <span className={`font-mono font-semibold ${resultColor}`}>{signal.resultPercent.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">Direção</span>
                <div className={`flex items-center space-x-1 ${isLong ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isLong ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                    <span>{signal.direction}</span>
                </div>
            </div>
             <div className="flex justify-between text-sm">
                <span className="text-gray-400">Alavancagem</span>
                <span className="font-mono">{signal.safeLeverage}x</span>
            </div>
        </div>
    );
});

// PERF: Memoized component for a single signal table row (desktop view) to prevent unnecessary re-renders.
const MemoizedSignalRow: React.FC<{ signal: HistoricalSignal }> = React.memo(({ signal }) => {
    const isLong = signal.direction === SignalDirection.LONG;
    const isWin = signal.status === SignalStatus.WIN;
    const isLoss = signal.status === SignalStatus.LOSS;
    const isPartial = signal.status === SignalStatus.PARTIAL_WIN;
    const resultColor = isWin ? 'text-brand-green' : isLoss ? 'text-brand-red' : 'text-gray-300';

    let statusText, statusBgColor, statusTextColor;
    if (isWin) {
        statusText = 'VITÓRIA'; statusBgColor = 'bg-green-500/10'; statusTextColor = 'text-brand-green';
    } else if (isLoss) {
        statusText = 'DERROTA'; statusBgColor = 'bg-red-500/10'; statusTextColor = 'text-brand-red';
    } else {
        statusText = 'ATIVO'; statusBgColor = 'bg-blue-500/10'; statusTextColor = 'text-brand-blue';
    }
    const hitTargets = signal.tpsHit?.filter(Boolean).length || 0;

    return (
        <tr className="hover:bg-gray-700/40">
            <td className="px-6 py-4 font-bold text-white">{signal.symbol}/{signal.pair}</td>
            <td className="px-6 py-4 whitespace-nowrap">{signal.resolvedAt.toLocaleTimeString('pt-BR')}</td>
            <td className="px-6 py-4">
                <div className={`flex items-center space-x-2 ${isLong ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isLong ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
                    <span>{signal.direction}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-center font-mono">{signal.safeLeverage}x</td>
            <td className={`px-6 py-4 font-mono font-semibold text-right ${resultColor}`}>
                {`${signal.resultPercent.toFixed(2)}%`}
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusBgColor} ${statusTextColor}`}>
                    {statusText}
                </span>
                {(isPartial || isWin) && hitTargets > 0 && 
                    <p className="text-xs text-gray-400 mt-1">{hitTargets}/5 Alvos</p>
                }
            </td>
        </tr>
    );
});


interface HistoryViewProps {
  report: {
    summary: {
      totalPnl: number;
      winRate: number;
      totalTrades: number;
      bestTrade: HistoricalSignal | null;
      wins: number;
      losses: number;
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
  currentDate: Date | null;
  onDateChange: (date: Date | null) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ report, currentFilter, onFilterChange, currentDate, onDateChange }) => {
    const { summary, groupedByDay } = report;
    const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));
    const hasData = Object.keys(groupedByDay).length > 0;
    
    const [visibleDaysCount, setVisibleDaysCount] = useState(INITIAL_DAYS_TO_SHOW);
    const [tempDate, setTempDate] = useState<Date | null>(currentDate);

    // Sync temp date with prop when filter changes
    useEffect(() => {
        setTempDate(currentDate);
    }, [currentDate]);

    // Reset pagination when filter changes (which changes the sortedDays array)
    useEffect(() => {
        setVisibleDaysCount(INITIAL_DAYS_TO_SHOW);
    }, [sortedDays.join(',')]); // A simple way to create a dependency on the array's content

    const visibleDays = sortedDays.slice(0, visibleDaysCount);


    const filters: { key: HistoryFilter, label: string }[] = [
        { key: 'day', label: 'Hoje'},
        { key: 'week', label: 'Esta Semana'},
        { key: 'month', label: 'Este Mês'},
        { key: 'year', label: 'Este Ano'},
        { key: 'all', label: 'Tudo'},
    ];

    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const [year, month, day] = e.target.value.split('-').map(Number);
            const selectedDate = new Date(Date.UTC(year, month - 1, day));
            setTempDate(selectedDate);
        } else {
            setTempDate(null);
        }
    };

    const handleApplyDate = () => {
        onDateChange(tempDate);
    };
    
    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-6">Relatório de Performance</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                    <p className="text-sm text-gray-400 font-medium mb-2">Taxa de Acerto</p>
                    <PieChart wins={summary.wins} losses={summary.losses} size={90} />
                </div>
                <StatCard 
                    title="Resultado (Fechado)"
                    value={`${summary.totalPnl.toFixed(2)}%`}
                    valueColor={summary.totalPnl >= 0 ? 'text-brand-green' : 'text-brand-red'}
                />
                <StatCard 
                    title="Vitórias"
                    value={summary.wins.toString()}
                    valueColor="text-brand-green"
                />
                 <StatCard 
                    title="Derrotas"
                    value={summary.losses.toString()}
                    valueColor="text-brand-red"
                />
                <StatCard 
                    title="Melhor Operação"
                    value={summary.bestTrade ? `${summary.bestTrade.symbol}` : 'N/A'}
                    helpText={summary.bestTrade ? `${summary.bestTrade.resultPercent.toFixed(2)}%` : ''}
                    valueColor={summary.bestTrade ? 'text-brand-blue' : 'text-white'}
                />
            </div>

             <div className="mb-6 flex items-center flex-wrap gap-2">
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
                 <div className="relative flex items-center gap-2">
                    <input
                        type="date"
                        value={formatDateForInput(tempDate)}
                        onChange={handleDateInputChange}
                        className={`pl-4 pr-2 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 border-2 ${
                            currentFilter === 'custom'
                            ? 'bg-brand-blue/20 border-brand-blue text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-transparent'
                        }`}
                        style={{ colorScheme: 'dark' }}
                    />
                    <button
                        onClick={handleApplyDate}
                        disabled={currentDate?.getTime() === tempDate?.getTime()}
                        className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 bg-brand-blue text-white hover:bg-brand-blue/80 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Aplicar
                    </button>
                </div>
            </div>

            {!hasData ? (
                <div className="text-center py-10 px-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">Nenhum histórico de sinal encontrado para o período selecionado.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleDays.map(date => {
                        const dayData = groupedByDay[date];
                        if (!dayData || dayData.signals.length === 0) return null;

                        const isDayProfitable = dayData.dailyPnl >= 0;

                        return (
                            <div key={date} className="bg-gray-800 rounded-lg shadow-lg">
                                <h3 className="px-4 py-3 text-center font-bold text-white tracking-wider bg-gray-900/50 rounded-t-lg">
                                    {new Date(date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                                </h3>
                                
                                <div className="md:hidden divide-y divide-gray-700">
                                    {dayData.signals.map(signal => (
                                       <MemoizedSignalCard key={`${signal.id}-${signal.timestamp.toISOString()}`} signal={signal} />
                                    ))}
                                </div>
                                
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full text-sm text-left text-gray-300">
                                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/20">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">Par</th>
                                                <th scope="col" className="px-6 py-3">Atualização</th>
                                                <th scope="col" className="px-6 py-3">Direção</th>
                                                <th scope="col" className="px-6 py-3 text-center">Alavancagem</th>
                                                <th scope="col" className="px-6 py-3 text-right">Resultado</th>
                                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {dayData.signals.map(signal => (
                                                <MemoizedSignalRow key={`${signal.id}-${signal.timestamp.toISOString()}`} signal={signal} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="bg-gray-900/50 font-bold flex justify-between items-center text-sm px-4 py-3 rounded-b-lg">
                                    <span className="text-gray-400">Resumo do dia: {dayData.wins} Vitórias / {dayData.losses} Derrotas</span>
                                    <span className={`text-right ${isDayProfitable ? 'text-brand-green' : 'text-brand-red'}`}>
                                        {dayData.dailyPnl.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {visibleDaysCount < sortedDays.length && (
                        <div className="text-center pt-4">
                            <button
                                onClick={() => setVisibleDaysCount(prev => prev + DAYS_TO_LOAD_INCREMENT)}
                                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
                            >
                                Carregar mais
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};