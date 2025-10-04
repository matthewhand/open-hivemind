import React, { SelectHTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';

export type SelectOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

export type SelectOptionGroup = {
  label: string;
  options: SelectOption[];
};

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: SelectOption[];
  optionGroups?: SelectOptionGroup[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  renderOption?: (option: SelectOption) => React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options = [],
      optionGroups = [],
      size,
      variant,
      loading,
      error,
      success,
      className,
      children,
      renderOption,
      ...props
    },
    ref
  ) => {
    const selectClasses = classNames(
      'select',
      'w-full',
      {
        'select-xs': size === 'xs',
        'select-sm': size === 'sm',
        'select-md': size === 'md',
        'select-lg': size === 'lg',
        'select-primary': variant === 'primary',
        'select-secondary': variant === 'secondary',
        'select-accent': variant === 'accent',
        'select-ghost': variant === 'ghost',
        'select-error': error,
        'select-success': success,
        'cursor-not-allowed opacity-60': props.disabled,
        'animate-pulse': loading,
      },
      className
    );

    const renderSingleOption = (option: SelectOption) => {
      if (renderOption) {
        return renderOption(option);
      }
      return (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      );
    };

    return (
      <div className="relative w-full">
        <select ref={ref} className={selectClasses} {...props}>
          {children}
          {options.map(renderSingleOption)}
          {optionGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map(renderSingleOption)}
            </optgroup>
          ))}
        </select>
        {loading && (
          <span className="loading loading-spinner absolute right-3 top-1/2 -translate-y-1/2"></span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;