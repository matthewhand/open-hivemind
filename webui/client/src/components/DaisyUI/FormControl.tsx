import React from 'react';

interface FormControlProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  required?: boolean;
  error?: boolean;
}

const FormControl: React.FC<FormControlProps> = ({
  children,
  fullWidth = false,
  className = '',
  required = false,
  error = false,
}) => {
  const classNames = `form-control ${fullWidth ? 'w-full' : ''} ${error ? 'has-error' : ''} ${className}`.trim();
  
  return (
    <div
      className={classNames}
      data-required={required}
    >
      {children}
    </div>
  );
};

export default FormControl;