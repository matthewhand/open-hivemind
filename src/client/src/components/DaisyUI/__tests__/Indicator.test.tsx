import React from 'react';
import { render, screen } from '@testing-library/react';
import Indicator from '../Indicator';

describe('Indicator', () => {
    describe('rendering', () => {
        it('should render content and indicator item', () => {
            render(
                <Indicator item={<span data-testid="indicator-item">Badge</span>}>
                    <div data-testid="content">Content</div>
                </Indicator>
            );
            expect(screen.getByTestId('content')).toBeInTheDocument();
            expect(screen.getByTestId('indicator-item')).toBeInTheDocument();
        });

        it('should apply indicator class', () => {
            const { container } = render(
                <Indicator item={<span>Badge</span>}>
                    <div>Content</div>
                </Indicator>
            );
            expect(container.firstChild).toHaveClass('indicator');
        });
    });

    describe('positioning', () => {
        it('should apply horizontal position class', () => {
            render(
                <Indicator item={<span>Badge</span>} horizontalPosition="center">
                    <div>Content</div>
                </Indicator>
            );
            // The indicator item is wrapped in a span with the classes
            const itemWrapper = screen.getByText('Badge').parentElement;
            expect(itemWrapper).toHaveClass('indicator-center');
        });

        it('should apply vertical position class', () => {
            render(
                <Indicator item={<span>Badge</span>} verticalPosition="bottom">
                    <div>Content</div>
                </Indicator>
            );
            const itemWrapper = screen.getByText('Badge').parentElement;
            expect(itemWrapper).toHaveClass('indicator-bottom');
        });

        it('should apply both position classes', () => {
            render(
                <Indicator item={<span>Badge</span>} horizontalPosition="start" verticalPosition="middle">
                    <div>Content</div>
                </Indicator>
            );
            const itemWrapper = screen.getByText('Badge').parentElement;
            expect(itemWrapper).toHaveClass('indicator-start');
            expect(itemWrapper).toHaveClass('indicator-middle');
        });
    });

    describe('custom classes', () => {
        it('should apply custom className to container', () => {
            const { container } = render(
                <Indicator item={<span>Badge</span>} className="custom-class">
                    <div>Content</div>
                </Indicator>
            );
            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('should apply itemClassName to indicator item', () => {
            render(
                <Indicator item={<span>Badge</span>} itemClassName="custom-item-class">
                    <div>Content</div>
                </Indicator>
            );
            const itemWrapper = screen.getByText('Badge').parentElement;
            expect(itemWrapper).toHaveClass('custom-item-class');
        });
    });
});
