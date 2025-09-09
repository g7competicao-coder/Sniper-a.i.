import React from 'react';

export const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={props.className}
    aria-hidden="true"
  >
    <path d="M12 2a10 10 0 00-3.535 19.34c.243.243.614.365.985.365h5.1c.37 0 .742-.122.985-.365A10 10 0 0012 2zm0 18c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM12 4c-2.4 0-4.47 1.6-5.18 3.86-.15.48.16.99.66 1.08.5.1 1-.22 1.15-.7.48-1.49 1.9-2.59 3.52-2.59s3.04 1.1 3.52 2.59c.15.48.65.79 1.15.7.5-.1.81-.6.66-1.08C16.47 5.6 14.4 4 12 4z"/>
  </svg>
);
