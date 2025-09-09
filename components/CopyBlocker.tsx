import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LockIcon } from './icons/LockIcon';

interface CopyBlockerProps {
  children: React.ReactNode;
}

export const CopyBlocker: React.FC<CopyBlockerProps> = ({ children }) => {
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(() => {
    // Se o toast já estiver visível, reinicie o timer
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setIsToastVisible(true);
    toastTimerRef.current = window.setTimeout(() => {
      setIsToastVisible(false);
    }, 3000); // O toast desaparecerá após 3 segundos
  }, []);

  const preventDefaultActions = useCallback((e: Event) => {
    e.preventDefault();
    showToast();
  }, [showToast]);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = wrapperRef.current;
    if (node) {
      // Impede copiar, recortar e o menu de contexto (botão direito)
      node.addEventListener('copy', preventDefaultActions);
      node.addEventListener('cut', preventDefaultActions);
      node.addEventListener('contextmenu', preventDefaultActions);

      // Função de limpeza para remover os event listeners
      return () => {
        node.removeEventListener('copy', preventDefaultActions);
        node.removeEventListener('cut', preventDefaultActions);
        node.removeEventListener('contextmenu', preventDefaultActions);
        
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
      };
    }
  }, [preventDefaultActions]);
  
  // Estilos CSS para desativar a seleção de texto, um método de prevenção adicional
  const style: React.CSSProperties = {
      userSelect: 'none',
      WebkitUserSelect: 'none', /* Safari */
      MozUserSelect: 'none', /* Firefox */
      msUserSelect: 'none', /* IE10+/Edge */
  };

  return (
    <div ref={wrapperRef} style={style}>
      {children}
      {isToastVisible && (
        <div 
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-brand-blue text-white text-sm font-semibold py-3 px-5 rounded-lg shadow-2xl flex items-center space-x-3 z-50 animate-fade-in-up"
            role="alert"
            aria-live="assertive"
        >
          <LockIcon className="h-5 w-5 flex-shrink-0" />
          <span>Cópia desativada. Use o botão 'Compartilhar Sinal'.</span>
        </div>
      )}
    </div>
  );
};
