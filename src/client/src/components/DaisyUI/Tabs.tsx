import React, { memo, useCallback } from 'react';
import classNames from 'classnames';

export interface TabItem {
  /** Unique key for the tab */
  key: string;
  /** Display label for the tab */
  label: string | React.ReactNode;
  /** Optional icon displayed before the label */
  icon?: React.ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
}

export interface TabsProps {
  /** Array of tab definitions */
  tabs: TabItem[];
  /** Currently active tab key (controlled) */
  activeTab: string;
  /** Callback fired when a tab is selected */
  onChange: (key: string) => void;
  /** Visual variant of the tabs container */
  variant?: 'boxed' | 'bordered' | 'lifted';
  /** Size of the tab items */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes for the container */
  className?: string;
}

const variantClasses: Record<string, string> = {
  boxed: 'tabs-boxed',
  bordered: 'tabs-bordered',
  lifted: 'tabs-lifted',
};

const sizeClasses: Record<string, string> = {
  xs: 'tabs-xs',
  sm: 'tabs-sm',
  md: '',
  lg: 'tabs-lg',
};

export const Tabs = memo(({
  tabs,
  activeTab,
  onChange,
  variant = 'boxed',
  size = 'md',
  className,
}: TabsProps) => {
  const handleClick = useCallback(
    (key: string, disabled?: boolean) => {
      if (!disabled) {
        onChange(key);
      }
    },
    [onChange],
  );

  const containerClasses = classNames(
    'tabs',
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  return (
    <div role="tablist" className={containerClasses}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;

        const tabClasses = classNames('tab', {
          'tab-active': isActive,
          'tab-disabled': tab.disabled,
        });

        return (
          <button
            key={tab.key}
            role="tab"
            className={tabClasses}
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => handleClick(tab.key, tab.disabled)}
          >
            {tab.icon && <span className="mr-1" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});

Tabs.displayName = 'Tabs';

export default Tabs;
