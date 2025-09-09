
import React from 'react';

export const SparkleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={props.className}
    >
        <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-7.184c0-1.681.673-3.352 1.868-4.547a4.5 4.5 0 011.232-1.031z" clipRule="evenodd" />
        <path d="M11.624 2.25a.75.75 0 01.75-.75h3.375a.75.75 0 01.75.75s-1.498 3.75-1.498 3.75a.75.75 0 01-1.5 0S11.624 2.25 11.624 2.25z" />
        <path d="M3.75 13.5a.75.75 0 01.75-.75h3.375a.75.75 0 01.75.75s-1.498 3.75-1.498 3.75a.75.75 0 01-1.5 0S3.75 13.5 3.75 13.5z" />
    </svg>
);