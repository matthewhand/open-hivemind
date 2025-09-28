import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with different color variants', () => {
    const { rerender } = render(<ProgressBar value={50} color="primary" />);
    expect(screen.getByRole('progressbar')).toHaveClass('progress-primary');

    rerender(<ProgressBar value={50} color="secondary" />);
    expect(screen.getByRole('progressbar')).toHaveClass('progress-secondary');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<ProgressBar value={50} size="sm" />);
    expect(screen.getByRole('progressbar')).toHaveClass('progress-sm');

    rerender(<ProgressBar value={50} size="lg" />);
    expect(screen.getByRole('progressbar')).toHaveClass('progress-lg');
  });

  it('displays the correct progress value', () => {
    render(<ProgressBar value={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '75');
  });

  it('has correct ARIA attributes', () => {
    render(<ProgressBar value={25} max={100} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays a label', () => {
    render(<ProgressBar value={50} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays the percentage', () => {
    render(<ProgressBar value={50} showPercentage />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});