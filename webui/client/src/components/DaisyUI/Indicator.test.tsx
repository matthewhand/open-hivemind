import { render } from '@testing-library/react';
import Indicator from './Indicator';

describe('Indicator Component', () => {
 it('renders children and indicator correctly', () => {
    const { getByText } = render(
      <Indicator indicator="5">
        <div>Content</div>
      </Indicator>
    );
    expect(getByText('Content')).toBeInTheDocument();
    expect(getByText('5')).toBeInTheDocument();
  });

 it('applies indicator-top indicator-end classes by default', () => {
    const { container } = render(
      <Indicator indicator="5">
        <div>Content</div>
      </Indicator>
    );
    expect(container.firstChild).toHaveClass('indicator');
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-top');
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-end');
  });

 it('applies correct position classes', () => {
    const { container } = render(
      <Indicator indicator="5" position="bottom-center">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-bottom');
    expect(container.querySelector('.indicator-item')).toHaveClass('indicator-center');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Indicator indicator="5" className="custom-class">
        <div>Content</div>
      </Indicator>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies custom indicatorClassName', () => {
    const { container } = render(
      <Indicator indicator="5" indicatorClassName="custom-indicator">
        <div>Content</div>
      </Indicator>
    );
    expect(container.querySelector('.indicator-item')).toHaveClass('custom-indicator');
  });

  it('passes data-testid attribute', () => {
    const { getByTestId } = render(
      <Indicator indicator="5" data-testid="indicator-test">
        <div>Content</div>
      </Indicator>
    );
    expect(getByTestId('indicator-test')).toBeInTheDocument();
  });

  it('passes additional HTML attributes', () => {
    const { container } = render(
      <Indicator indicator="5" id="indicator-id" aria-label="Indicator container">
        <div>Content</div>
      </Indicator>
    );
    expect(container.firstChild).toHaveAttribute('id', 'indicator-id');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Indicator container');
  });
});