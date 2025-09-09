

import React from 'react';
import { ListIcon } from './icons/ListIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface BottomNavProps {
  currentView: 'signals' | 'history';
  onViewChange: (view: 'signals' | 'history') => void;
}

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  const activeColor = 'text-brand-blue';
  const inactiveColor = 'text-gray-400';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeColor : inactiveColor} hover:bg-gray-700/50`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
      <span className="text-xs font-medium mt-1">{label}</span>
    </button>
  );
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="md:hidden sticky bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex z-20">
      <NavButton
        label="Sinais"
        icon={<ChartBarIcon className="h-6 w-6" />}
        isActive={currentView === 'signals'}
        onClick={() => onViewChange('signals')}
      />
      <NavButton
        label="Histórico"
        icon={<ListIcon className="h-6 w-6" />}
        isActive={currentView === 'history'}
        onClick={() => onViewChange('history')}
      />
    </nav>
  );
};