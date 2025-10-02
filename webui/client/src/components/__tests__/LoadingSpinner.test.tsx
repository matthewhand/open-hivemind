import { render, screen } from '../../test-utils';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  test('renders with default props', () => {
    render(<LoadingSpinner />);

    // Check that the spinner is rendered
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();

    // Check default message
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('renders with custom message', () => {
    const customMessage = 'Please wait...';
    render(<LoadingSpinner message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  test('renders without message when message prop is empty', () => {
    render(<LoadingSpinner message="" />);

    // Spinner should still be there
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // No message should be displayed
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('renders with custom size', () => {
    const customSize = 60;
    render(<LoadingSpinner size={customSize} />);

    const spinner = screen.getByRole('progressbar');
    // Note: Testing exact size might be tricky with MUI's CircularProgress
    // This is more of a smoke test to ensure the prop is passed through
    expect(spinner).toBeInTheDocument();
  });

  test('renders in fullscreen mode', () => {
    render(<LoadingSpinner fullScreen />);

    // Check that the spinner is still rendered
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // The fullscreen container should have full viewport height
    const container = screen.getByRole('progressbar').parentElement?.parentElement;
    expect(container).toHaveStyle({ minHeight: '100vh' });
  });

  test('renders in normal mode (not fullscreen)', () => {
    render(<LoadingSpinner fullScreen={false} />);

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();

    // In normal mode, there should be no fullscreen container
    const container = spinner.parentElement;
    expect(container).not.toHaveStyle({ minHeight: '100vh' });
  });

  test('applies correct styling for centered content', () => {
    render(<LoadingSpinner />);

    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  test('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
    // CircularProgress should be accessible via role
    expect(spinner).toHaveAttribute('role', 'progressbar');
  });

  test('renders message with correct typography variant', () => {
    render(<LoadingSpinner message="Custom message" />);

    const message = screen.getByText('Custom message');
    expect(message).toHaveClass('MuiTypography-body2');
  });

  test('maintains proper spacing between spinner and message', () => {
    render(<LoadingSpinner message="Test message" />);

    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveStyle({ gap: '16px' }); // MUI spacing unit * 2
  });
});