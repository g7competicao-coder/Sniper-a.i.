import React from 'react';

export const ThumbUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className={props.className} 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M1 8.25a1.25 1.25 0 112.5 0v7.5a1.25 1.25 0 11-2.5 0v-7.5zM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0114 3c0 .995-.182 1.948-.514 2.826-.224.597-.023 1.28.45 1.639.474.36.416 1.073-.082 1.568a2 2 0 01-.78 1.003l-4.25 2.55A1.25 1.25 0 018 13.25V8.25a1.25 1.25 0 011.25-1.25h3.5a1.25 1.25 0 001.25-1.25v-1.5A1.25 1.25 0 0012.75 3H11z" />
  </svg>
);
