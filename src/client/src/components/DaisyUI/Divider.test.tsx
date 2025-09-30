import React from 'react';
import { render } from '@testing-library/react';
import Divider from './Divider';

describe('Divider Component', () => {
  it('renders with default horizontal divider', () => {
    const { container } = render(<Divider />);
    expect(container.firstChild).toHaveClass('divider');
    expect(container.firstChild).toHaveClass('divider-horizontal');
  });

  it('renders vertical divider', () => {
    const { container } = render(<Divider horizontal={false} />);
    expect(container.firstChild).toHaveClass('divider');
    expect(container.firstChild).toHaveClass('divider-vertical');
  });

  it('renders text in the center', () => {
    const { getByText } = render(<Divider text="Or" />);
    expect(getByText('Or')).toBeInTheDocument();
    expect(getByText('Or')).toHaveClass('divider-label');
  });

  it('renders as horizontal rule with text', () => {
    const { getByText, container } = render(<Divider horizontalRule text="Section" />);
    expect(getByText('Section')).toBeInTheDocument();
    const hrElements = container.querySelectorAll('hr');
    expect(hrElements).toHaveLength(2);
    expect(hrElements[0]).toHaveClass('divider-item');
  });

  it('applies custom className', () => {
    const { container } = render(<Divider className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes data-testid attribute', () => {
    const { getByTestId } = render(<Divider data-testid="divider-test" />);
    expect(getByTestId('divider-test')).toBeInTheDocument();
  });

  it('passes additional HTML attributes', () => {
    const { container } = render(
      <Divider id="divider-id" aria-label="Separator" />
    );
    expect(container.firstChild).toHaveAttribute('id', 'divider-id');
    expect(container.firstChild).toHaveAttribute('aria-label', 'Separator');
  });
});