import React from 'react';
import classNames from 'classnames';

export interface SwapProps extends Omit<React.HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  /** Whether the swap is in the "on" state */
  checked?: boolean;
  /** Callback when the swap state changes */
  onChange?: (checked: boolean) => void;
  /** Content shown when checked/active */
  onContent: React.ReactNode;
  /** Content shown when unchecked/inactive */
  offContent: React.ReactNode;
  /** Apply rotate animation on swap */
  rotate?: boolean;
  /** Apply flip animation on swap */
  flip?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const Swap: React.FC<SwapProps> = React.memo(({
  checked,
  onChange,
  onContent,
  offContent,
  rotate = false,
  flip = false,
  className,
  ...props
}) => {
  const classes = classNames(
    'swap',
    {
      'swap-rotate': rotate,
      'swap-flip': flip,
    },
    className,
  );

  return (
    <label className={classes} {...props}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      <div className="swap-on">{onContent}</div>
      <div className="swap-off">{offContent}</div>
    </label>
  );
});

Swap.displayName = 'Swap';

export default Swap;
