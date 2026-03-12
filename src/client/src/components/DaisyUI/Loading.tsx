import React from 'react';
export const LoadingSpinner: React.FC<any> = () => <div />;
export const Progress: React.FC<any> = ({ value, max = 100, className = '' }) => (
  <progress className={`progress ${className}`} value={value} max={max}></progress>
);
export default LoadingSpinner;
