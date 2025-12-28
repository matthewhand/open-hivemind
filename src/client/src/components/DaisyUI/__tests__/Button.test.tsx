import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
    describe('rendering', () => {
        it('should render with children', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button')).toHaveTextContent('Click me');
        });

        it('should apply btn base class', () => {
            render(<Button>Test</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn');
        });
    });

    describe('variants', () => {
        it('should apply primary variant by default', () => {
            render(<Button>Primary</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-primary');
        });

        it('should apply secondary variant', () => {
            render(<Button variant="secondary">Secondary</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-secondary');
        });

        it('should apply accent variant', () => {
            render(<Button variant="accent">Accent</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-accent');
        });

        it('should apply ghost variant', () => {
            render(<Button variant="ghost">Ghost</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-ghost');
        });

        it('should apply outline style', () => {
            render(<Button buttonStyle="outline">Outline</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-outline');
        });
    });

    describe('sizes', () => {
        it('should apply xs size', () => {
            render(<Button size="xs">XS</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-xs');
        });

        it('should apply sm size', () => {
            render(<Button size="sm">SM</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-sm');
        });

        it('should apply lg size', () => {
            render(<Button size="lg">LG</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-lg');
        });

        it('should not apply size class for md (default)', () => {
            render(<Button size="md">MD</Button>);
            const button = screen.getByRole('button');
            expect(button).not.toHaveClass('btn-md');
            expect(button).not.toHaveClass('btn-xs', 'btn-sm', 'btn-lg');
        });
    });

    describe('loading state', () => {
        it('should show loading spinner when loading', () => {
            render(<Button loading>Loading</Button>);
            expect(screen.getByRole('button').querySelector('.loading-spinner')).toBeInTheDocument();
        });

        it('should show loading text when provided', () => {
            render(<Button loading loadingText="Please wait...">Submit</Button>);
            expect(screen.getByRole('button')).toHaveTextContent('Please wait...');
        });

        it('should be disabled when loading', () => {
            render(<Button loading>Loading</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('disabled state', () => {
        it('should be disabled when disabled prop is true', () => {
            render(<Button disabled>Disabled</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('should have disabled class when disabled', () => {
            render(<Button disabled>Disabled</Button>);
            expect(screen.getByRole('button')).toHaveClass('btn-disabled');
        });
    });

    describe('click handling', () => {
        it('should call onClick when clicked', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick}>Click</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('should not call onClick when disabled', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick} disabled>Click</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).not.toHaveBeenCalled();
        });

        it('should not call onClick when loading', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick} loading>Click</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe('icons', () => {
        it('should render icon on the left', () => {
            render(<Button icon={<span data-testid="icon">★</span>}>With Icon</Button>);
            expect(screen.getByTestId('icon')).toBeInTheDocument();
        });

        it('should render startIcon on the left', () => {
            render(<Button startIcon={<span data-testid="start-icon">◀</span>}>Start</Button>);
            expect(screen.getByTestId('start-icon')).toBeInTheDocument();
        });

        it('should render iconRight on the right', () => {
            render(<Button iconRight={<span data-testid="right-icon">▶</span>}>Right</Button>);
            expect(screen.getByTestId('right-icon')).toBeInTheDocument();
        });

        it('should render endIcon on the right', () => {
            render(<Button endIcon={<span data-testid="end-icon">→</span>}>End</Button>);
            expect(screen.getByTestId('end-icon')).toBeInTheDocument();
        });

        it('should hide icons when loading', () => {
            render(
                <Button loading icon={<span data-testid="hidden-icon">★</span>}>
                    Loading
                </Button>
            );
            expect(screen.queryByTestId('hidden-icon')).not.toBeInTheDocument();
        });
    });

    describe('custom className', () => {
        it('should apply custom className', () => {
            render(<Button className="my-custom-class">Custom</Button>);
            expect(screen.getByRole('button')).toHaveClass('my-custom-class');
        });
    });
});
