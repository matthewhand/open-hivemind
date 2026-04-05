import React from 'react';
import classNames from 'classnames';

export interface FigureProps extends React.HTMLAttributes<HTMLElement> {
  /** Image source URL */
  src?: string;
  /** Image alt text */
  alt?: string;
  /** Caption text displayed below the image */
  caption?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Figure: React.FC<FigureProps> = React.memo(({
  src,
  alt = '',
  caption,
  className,
  children,
  ...props
}) => {
  const classes = classNames('figure', className);

  return (
    <figure className={classes} {...props}>
      {src && <img src={src} alt={alt} />}
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
});

Figure.displayName = 'Figure';

export default Figure;
