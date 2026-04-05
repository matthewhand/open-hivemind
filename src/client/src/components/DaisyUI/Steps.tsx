import React from 'react';
import classNames from 'classnames';

export interface StepItem {
  /** Content rendered inside the step indicator */
  content?: React.ReactNode;
  /** Text label rendered after the step indicator */
  label?: React.ReactNode;
  /** Color variant for the step */
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  /** Override the data-content attribute (e.g. checkmark character) */
  dataContent?: string;
  /** Additional CSS classes */
  className?: string;
}

export interface StepsProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Step items to render */
  items: StepItem[];
  /** Layout direction */
  variant?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

const Steps: React.FC<StepsProps> = ({
  items,
  variant = 'horizontal',
  className,
  ...props
}) => {
  const classes = classNames(
    'steps',
    { 'steps-vertical': variant === 'vertical' },
    className,
  );

  return (
    <ul className={classes} {...props}>
      {items.map((item, index) => {
        const stepClasses = classNames(
          'step',
          { [`step-${item.color}`]: item.color },
          item.className,
        );

        return (
          <li
            key={index}
            className={stepClasses}
            {...(item.dataContent !== undefined ? { 'data-content': item.dataContent } : {})}
          >
            {item.content || item.label}
          </li>
        );
      })}
    </ul>
  );
};

Steps.displayName = 'Steps';

export default Steps;
