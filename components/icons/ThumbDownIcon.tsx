import React from 'react';

export const ThumbDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={props.className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M1 11.75a1.25 1.25 0 102.5 0v-7.5a1.25 1.25 0 10-2.5 0v7.5zM11 17v1.3c0 .268-.14.526-.395.607A2 2 0 0014 17c0-.995.182-1.948.514-2.826.224-.597.023-1.28-.45-1.639-.474-.36-.416-1.073.082-1.568a2 2 0 00.78-1.003l4.25-2.55A1.25 1.25 0 0018 6.75v-1.5a1.25 1.25 0 00-1.25-1.25h-3.5A1.25 1.25 0 0012 5.25v5a1.25 1.25 0 01-1.25 1.25H8a1.25 1.25 0 000 2.5h3z" />
  </svg>
);
