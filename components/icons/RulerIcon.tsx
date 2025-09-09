import React from 'react';

export const RulerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={props.className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h12A2.25 2.25 0 0020.25 14.25V3M3.75 12h16.5m-16.5 3.75h16.5M12 3v1.5M12 6v1.5M12 9V7.5M7.5 3v1.5M7.5 6v1.5M7.5 9V7.5m9-4.5v1.5m0 3v1.5m0 3V7.5" />
  </svg>
);
