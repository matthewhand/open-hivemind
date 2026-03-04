import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Timeline, { TimelineEvent } from '../Timeline';

describe('Timeline', () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = jest.fn();
    });

    const mockEvents: TimelineEvent[] = [
        {
            id: '1',
            timestamp: new Date('2023-01-01T12:00:00Z'),
            title: 'Test Event',
            description: 'This is a test event',
            type: 'success',
            details: <div>Details content</div>
        }
    ];

    it('renders event title and description', () => {
        render(<Timeline events={mockEvents} />);
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('This is a test event')).toBeInTheDocument();
    });

    it('renders accessibility attributes for status icons', () => {
        render(<Timeline events={mockEvents} />);
        const icon = screen.getByRole('img', { name: 'success' });
        expect(icon).toBeInTheDocument();
    });

    it('makes timeline items keyboard accessible when clickable', () => {
        const handleEventClick = jest.fn();
        render(<Timeline events={mockEvents} onEventClick={handleEventClick} />);

        const card = screen.getByText('Test Event').closest('.card');
        expect(card).toBeInTheDocument();
        expect(card).toHaveAttribute('role', 'button');
        expect(card).toHaveAttribute('tabIndex', '0');

        fireEvent.keyDown(card!, { key: 'Enter' });
        expect(handleEventClick).toHaveBeenCalled();
    });

    it('makes compact mode items keyboard accessible for expansion', () => {
        render(<Timeline events={mockEvents} viewMode="compact" />);

        const card = screen.getByText('Test Event').closest('.card');
        expect(card).toHaveAttribute('role', 'button');
        expect(card).toHaveAttribute('aria-expanded', 'false');
    });
});
