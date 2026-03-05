import React from 'react';
import { render, screen } from '@testing-library/react';
import Indicator from '../Indicator';

describe('Indicator', () => {
    describe('rendering', () => {
        it('should render children content', () => {
            render(
                <Indicator item={<span>Badge</span>}>
                    <button>Button</button>
                </Indicator>
            );
            expect(screen.getByText('Button')).toBeInTheDocument();
        });

        it('should render indicator item', () => {
            render(
                <Indicator item={<span>Badge</span>}>
                    <button>Button</button>
                </Indicator>
            );
            expect(screen.getByText('Badge')).toBeInTheDocument();
        });

        it('should apply indicator class to container', () => {
            const { container } = render(
                <Indicator item={<span>Badge</span>}>
                    <button>Button</button>
                </Indicator>
            );
            expect(container.firstChild).toHaveClass('indicator');
        });

        it('should apply indicator-item class to item wrapper', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>}>
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-item');
        });
    });

    describe('positions', () => {
        it('should apply top-end position by default', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>}>
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).not.toHaveClass('indicator-start');
            expect(badgeWrapper).not.toHaveClass('indicator-center');
            expect(badgeWrapper).not.toHaveClass('indicator-middle');
            expect(badgeWrapper).not.toHaveClass('indicator-bottom');
        });

        it('should apply indicator-start when horizontalPosition is start', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>} horizontalPosition="start">
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-start');
        });

        it('should apply indicator-center when horizontalPosition is center', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>} horizontalPosition="center">
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-center');
        });

        it('should apply indicator-bottom when verticalPosition is bottom', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>} verticalPosition="bottom">
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-bottom');
        });

        it('should apply indicator-middle when verticalPosition is middle', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>} verticalPosition="middle">
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-middle');
        });

        it('should combine vertical and horizontal positions', () => {
            render(
                <Indicator
                    item={<span data-testid="badge">Badge</span>}
                    verticalPosition="bottom"
                    horizontalPosition="center"
                >
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('indicator-bottom');
            expect(badgeWrapper).toHaveClass('indicator-center');
        });
    });

    describe('custom className', () => {
        it('should apply custom className to container', () => {
            const { container } = render(
                <Indicator item={<span>Badge</span>} className="custom-class">
                    <button>Button</button>
                </Indicator>
            );
            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('should apply itemClassName to item wrapper', () => {
            render(
                <Indicator item={<span data-testid="badge">Badge</span>} itemClassName="custom-item-class">
                    <button>Button</button>
                </Indicator>
            );
            const badgeWrapper = screen.getByTestId('badge').parentElement;
            expect(badgeWrapper).toHaveClass('custom-item-class');
        });
    });
});
