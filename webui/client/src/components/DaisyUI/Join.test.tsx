import { render } from '@testing-library/react';
import Join from './Join';

describe('Join Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Join>
        <button>Button 1</button>
        <button>Button 2</button>
      </Join>
    );
    expect(getByText('Button 1')).toBeInTheDocument();
    expect(getByText('Button 2')).toBeInTheDocument();
  });

  it('applies horizontal join class by default', () => {
    const { container } = render(
      <Join>
        <button>Button</button>
      </Join>
    );
    expect(container.firstChild).toHaveClass('join-horizontal');
  });

  it('applies vertical join class when specified', () => {
    const { container } = render(
      <Join vertical>
        <button>Button</button>
      </Join>
    );
    expect(container.firstChild).toHaveClass('join-vertical');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Join className="custom-class">
        <button>Button</button>
      </Join>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes data-testid attribute', () => {
    const { getByTestId } = render(
      <Join data-testid="join-test">
        <button>Button</button>
      </Join>
    );
    expect(getByTestId('join-test')).toBeInTheDocument();
  });

  it('passes additional HTML attributes', () => {
    const { container } = render(
      <Join id="join-id" aria-label="Join group">
        <button>Button</button>
      </Join>
    );
    expect(container.firstChild).toHaveAttribute('id', 'join-id');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Join group');
  });
});