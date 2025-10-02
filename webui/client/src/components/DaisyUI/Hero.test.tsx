import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Hero, HeroProps } from './Hero';

const renderHero = (props: HeroProps) => {
  return render(<Hero {...props} />);
};

describe('Hero Component', () => {
  const defaultProps: HeroProps = {
    title: 'Welcome to Dashboard',
    subtitle: 'Get started with our amazing features',
    'data-testid': 'hero-test'
  };

  it('renders title and subtitle correctly', () => {
    renderHero(defaultProps);
    
    expect(screen.getByTestId('hero-test-title')).toHaveTextContent('Welcome to Dashboard');
    expect(screen.getByTestId('hero-test-subtitle')).toHaveTextContent('Get started with our amazing features');
  });

  it('applies correct variant classes', () => {
    // Test normal variant
    const { rerender } = render(<Hero variant="normal" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).not.toHaveClass('hero-overlay');
    
    // Test overlay variant
    rerender(<Hero variant="overlay" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).toContainElement(screen.getByTestId('hero-test').firstChild as HTMLElement);
    expect(screen.getByTestId('hero-test').firstChild).toHaveClass('hero-overlay');
  });

  it('applies correct background classes when no image is provided', () => {
    renderHero({ ...defaultProps, bgColor: 'bg-primary' });
    expect(screen.getByTestId('hero-test')).toHaveClass('bg-primary');
  });

  it('applies background image when provided', () => {
    const bgImage = 'https://example.com/image.jpg';
    renderHero({ ...defaultProps, bgImage });
    
    const heroElement = screen.getByTestId('hero-test');
    expect(heroElement).toHaveStyle(`background-image: url(${bgImage})`);
  });

  it('renders actions when provided', () => {
    const actions = (
      <div>
        <button>Get Started</button>
        <button>Learn More</button>
      </div>
    );
    
    renderHero({ ...defaultProps, actions });
    expect(screen.getByTestId('hero-test-actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learn More' })).toBeInTheDocument();
  });

  it('renders children when provided', () => {
    const customContent = (
      <div>
        <h2>Custom Title</h2>
        <p>Custom subtitle</p>
      </div>
    );
    
    renderHero({ children: customContent, 'data-testid': 'hero-test' });
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom subtitle')).toBeInTheDocument();
  });

  it('applies correct alignment classes', () => {
    // Test center alignment
    const { rerender } = render(<Hero alignment="center" {...defaultProps} />);
    const heroContent = screen.getByTestId('hero-test').querySelector('.hero-content');
    expect(heroContent).toHaveClass('text-center');
    
    // Test left alignment
    rerender(<Hero alignment="left" {...defaultProps} />);
    const heroContentLeft = screen.getByTestId('hero-test').querySelector('.hero-content');
    expect(heroContentLeft).toHaveClass('text-left');
  });

  it('applies correct minimum height classes', () => {
    // Test screen height
    const { rerender } = render(<Hero minHeight="screen" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).toHaveClass('min-h-screen');
    
    // Test large height
    rerender(<Hero minHeight="lg" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).toHaveClass('min-h-96');
    
    // Test medium height
    rerender(<Hero minHeight="md" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).toHaveClass('min-h-64');
    
    // Test small height
    rerender(<Hero minHeight="sm" {...defaultProps} />);
    expect(screen.getByTestId('hero-test')).toHaveClass('min-h-32');
  });

  it('applies gradient overlay when specified', () => {
    renderHero({ ...defaultProps, gradient: true });
    expect(screen.getByTestId('hero-test')).toContainElement(screen.getByTestId('hero-test').firstChild as HTMLElement);
    expect(screen.getByTestId('hero-test').firstChild).toHaveClass('hero-overlay');
  });

  it('applies custom class names', () => {
    renderHero({ ...defaultProps, className: 'custom-class another-class' });
    expect(screen.getByTestId('hero-test')).toHaveClass('custom-class', 'another-class');
  });

  it('applies correct text colors', () => {
    renderHero({ 
      ...defaultProps, 
      titleColor: 'text-secondary', 
      subtitleColor: 'text-accent' 
    });
    
    expect(screen.getByTestId('hero-test-title')).toHaveClass('text-secondary');
    expect(screen.getByTestId('hero-test-subtitle')).toHaveClass('text-accent');
  });

  it('has proper accessibility attributes', () => {
    renderHero({ ...defaultProps, 'aria-label': 'Dashboard Welcome' });
    expect(screen.getByLabelText('Dashboard Welcome')).toBeInTheDocument();
    expect(screen.getByTestId('hero-test')).toHaveAttribute('role', 'banner');
  });

  it('renders content variant correctly', () => {
    renderHero({ ...defaultProps, variant: 'content' });
    const heroContent = screen.getByTestId('hero-test').querySelector('.hero-content');
    expect(heroContent).toHaveClass('flex-col', 'lg:flex-row');
  });
});