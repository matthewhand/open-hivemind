import React from 'react';

type MockupType = 'code' | 'browser' | 'phone' | 'window';
type Theme = 'light' | 'dark';
type ColorScheme = 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';

interface MockupProps {
  type: MockupType;
  content: React.ReactNode;
  theme?: Theme;
  colorScheme?: ColorScheme;
  width?: string;
  height?: string;
  className?: string;
  ariaLabel?: string;
}

const Mockup: React.FC<MockupProps> = ({
  type,
  content,
  theme = 'light',
  colorScheme,
  width,
  height,
  className = '',
  ariaLabel = 'Mockup component',
}) => {
  const baseClasses = 'mockup-';
  const themeClass = theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black';
  const colorClass = colorScheme ? `bg-${colorScheme}` : '';

  const containerStyle: React.CSSProperties = {
    width: width || 'auto',
    height: height || 'auto',
  };

  const renderContent = () => {
    switch (type) {
      case 'code':
        return (
          <div className={`${baseClasses}code ${colorClass} ${className}`} style={containerStyle} role="region" aria-label={ariaLabel}>
            <pre><code>{content}</code></pre>
          </div>
        );
      case 'browser':
        return (
          <div className={`${baseClasses}browser border ${colorClass} ${className}`} style={containerStyle} role="region" aria-label={ariaLabel}>
            <div className="mockup-browser-toolbar">
              <div className="input">{content}</div>
            </div>
            <div className={`flex justify-center px-4 py-16 ${themeClass}`}>Hello!</div>
          </div>
        );
      case 'phone':
        return (
          <div className={`${baseClasses}phone ${colorClass} ${className}`} style={containerStyle} role="region" aria-label={ariaLabel}>
            <div className="camera"></div>
            <div className="display">
              <div className={`artboard artboard-demo phone-1 ${themeClass}`}>{content}</div>
            </div>
          </div>
        );
      case 'window':
        return (
          <div className={`${baseClasses}window border ${colorClass} ${className}`} style={containerStyle} role="region" aria-label={ariaLabel}>
            <div className={`flex justify-center px-4 py-16 ${themeClass}`}>{content}</div>
          </div>
        );
      default:
        return null;
    }
  };

  return renderContent();
};

export default Mockup;