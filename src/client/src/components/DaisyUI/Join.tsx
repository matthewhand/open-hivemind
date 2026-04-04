import React from 'react';

export interface JoinProps {
  children: React.ReactNode;
  /** Stack items vertically instead of horizontally */
  vertical?: boolean;
  className?: string;
}

/**
 * DaisyUI Join wrapper -- groups child elements together (button groups, input groups).
 * Children should include `join-item` in their className.
 *
 * @example
 * <Join>
 *   <Button className="join-item">A</Button>
 *   <Button className="join-item">B</Button>
 * </Join>
 */
const Join: React.FC<JoinProps> = ({ children, vertical = false, className = '' }) => (
  <div className={`join ${vertical ? 'join-vertical' : ''} ${className}`.trim()}>
    {children}
  </div>
);

export default Join;
