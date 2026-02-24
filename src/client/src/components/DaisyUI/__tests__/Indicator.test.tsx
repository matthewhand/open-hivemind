import React from 'react';
import { render, screen } from '@testing-library/react';
import Indicator from '../Indicator';
import Badge from '../Badge';

describe('Indicator', () => {
    it('should render content and indicator item', () => {
        render(
            <Indicator item={<Badge>New</Badge>}>
                <div>Content</div>
            </Indicator>
        );
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should apply indicator class', () => {
        const { container } = render(
            <Indicator item={<Badge>New</Badge>}>
                <div>Content</div>
            </Indicator>
        );
        expect(container.firstChild).toHaveClass('indicator');
    });

    it('should apply vertical position classes', () => {
        const { container: containerMiddle } = render(
            <Indicator item={<Badge>New</Badge>} vertical="middle">
                <div>Content</div>
            </Indicator>
        );
        expect(containerMiddle.querySelector('.indicator-item')).toHaveClass('indicator-middle');

        const { container: containerBottom } = render(
            <Indicator item={<Badge>New</Badge>} vertical="bottom">
                <div>Content</div>
            </Indicator>
        );
        expect(containerBottom.querySelector('.indicator-item')).toHaveClass('indicator-bottom');
    });

    it('should apply horizontal position classes', () => {
        const { container: containerStart } = render(
            <Indicator item={<Badge>New</Badge>} horizontal="start">
                <div>Content</div>
            </Indicator>
        );
        expect(containerStart.querySelector('.indicator-item')).toHaveClass('indicator-start');

        const { container: containerCenter } = render(
            <Indicator item={<Badge>New</Badge>} horizontal="center">
                <div>Content</div>
            </Indicator>
        );
        expect(containerCenter.querySelector('.indicator-item')).toHaveClass('indicator-center');
    });

    it('should combine custom classes', () => {
        const { container } = render(
            <Indicator item={<Badge>New</Badge>} className="custom-class" itemClassName="custom-item-class">
                <div>Content</div>
            </Indicator>
        );
        expect(container.firstChild).toHaveClass('custom-class');
        expect(container.querySelector('.indicator-item')).toHaveClass('custom-item-class');
    });
});
