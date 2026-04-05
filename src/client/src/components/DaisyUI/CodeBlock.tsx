import React from 'react';

export interface CodeBlockProps {
  /** Code content to display */
  children: React.ReactNode;
  /** Maximum height constraint */
  maxHeight?: string;
  /** Text size variant */
  textSize?: 'text-xs' | 'text-sm';
  /** Background variant */
  variant?: 'default' | 'error' | 'success';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A reusable code/preformatted text block component.
 * Replaces repeated `<pre className="bg-base-300 p-2 rounded text-xs overflow-auto">` patterns.
 */
const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  maxHeight = 'max-h-48',
  textSize = 'text-xs',
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-base-300 text-base-content',
    error: 'bg-error/10 text-error',
    success: 'bg-success/10 text-success',
  };

  return (
    <pre
      className={`p-2 rounded font-mono ${textSize} overflow-x-auto whitespace-pre-wrap ${variantClasses[variant]} ${maxHeight} ${className}`}
    >
      {children}
    </pre>
  );
};

export default CodeBlock;
