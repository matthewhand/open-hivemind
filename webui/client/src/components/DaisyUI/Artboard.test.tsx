import { render } from '@testing-library/react';
import Artboard from './Artboard';

describe('Artboard Component', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Artboard>
        <div>Test Content</div>
      </Artboard>
    );
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('applies artboard base class', () => {
    const { container } = render(
      <Artboard>
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).toHaveClass('artboard');
  });

  it('applies phone class when phone prop is true', () => {
    const { container } = render(
      <Artboard phone size={2}>
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).toHaveClass('phone-2');
  });

  it('applies horizontal phone class when phone and horizontal props are true', () => {
    const { container } = render(
      <Artboard phone horizontal size={3}>
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).toHaveClass('phone-3');
    expect(container.firstChild).toHaveClass('artboard-horizontal');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Artboard className="custom-class">
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes data-testid attribute', () => {
    const { getByTestId } = render(
      <Artboard data-testid="artboard-test">
        <div>Content</div>
      </Artboard>
    );
    expect(getByTestId('artboard-test')).toBeInTheDocument();
  });

  it('passes additional HTML attributes', () => {
    const { container } = render(
      <Artboard id="artboard-id" aria-label="Artboard container">
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).toHaveAttribute('id', 'artboard-id');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Artboard container');
  });

  it('does not apply phone class when phone prop is false', () => {
    const { container } = render(
      <Artboard phone={false} size={2}>
        <div>Content</div>
      </Artboard>
    );
    expect(container.firstChild).not.toHaveClass('phone-2');
  });
});