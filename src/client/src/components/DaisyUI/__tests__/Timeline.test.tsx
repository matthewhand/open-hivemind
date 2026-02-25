import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Timeline, { TimelineEvent, ActivityFeed } from '../Timeline'

const mockEvents: TimelineEvent[] = [
    {
        id: 'event-1',
        timestamp: new Date(),
        title: 'System Online',
        description: 'All systems operational',
        type: 'success',
        metadata: { status: 'healthy' },
    },
    {
        id: 'event-2',
        timestamp: new Date(Date.now() - 3600000),
        title: 'Warning Alert',
        description: 'High memory usage detected',
        type: 'warning',
        metadata: { memory: '90%' },
    },
    {
        id: 'event-3',
        timestamp: new Date(Date.now() - 7200000),
        title: 'Error Occurred',
        description: 'Database connection failed',
        type: 'error',
        metadata: { retries: 3 },
    },
]

describe('Timeline Component Accessibility', () => {
    test('should render timeline with proper ARIA labels', () => {
        render(<Timeline events={mockEvents} />)

        // Check main timeline has list role and label
        const timeline = screen.getByRole('list', { name: /timeline of events/i })
        expect(timeline).toBeInTheDocument()

        // Check each event has listitem role
        const eventItems = screen.getAllByRole('listitem')
        expect(eventItems).toHaveLength(3)

        // Check event icons have proper ARIA labels
        const successIcon = screen.getByRole('img', { name: /event type: success/i })
        expect(successIcon).toBeInTheDocument()

        const errorIcon = screen.getByRole('img', { name: /event type: error/i })
        expect(errorIcon).toBeInTheDocument()

        const warningIcon = screen.getByRole('img', { name: /event type: warning/i })
        expect(warningIcon).toBeInTheDocument()
    })

    test('should be keyboard navigable', () => {
        render(<Timeline events={mockEvents} />)

        const eventCards = screen.getAllByRole('button')
        expect(eventCards).toHaveLength(3)

        // Focus on first event
        eventCards[0].focus()
        expect(eventCards[0]).toHaveFocus()

        // Simulate keyboard navigation
        fireEvent.keyDown(eventCards[0], { key: 'Enter' })
        fireEvent.keyDown(eventCards[0], { key: ' ' })

        // Check that events have proper tabIndex
        eventCards.forEach(card => {
            expect(card).toHaveAttribute('tabindex', '0')
        })
    })

    test('should have proper ARIA labels for interactive elements', () => {
        render(<Timeline events={mockEvents} />)

        // Check event cards have proper ARIA labels
        const eventCards = screen.getAllByRole('button')
        eventCards.forEach((card, index) => {
            expect(card).toHaveAttribute('aria-label')
            expect(card.getAttribute('aria-label')).toContain(mockEvents[index].title)
        })

        // Check expand/collapse icons have proper ARIA labels
        const expandIcons = screen.getAllByRole('img', { name: /expand details/i })
        expect(expandIcons).toHaveLength(1) // Only one event has details in our mock

        // Check empty state has proper ARIA labels
        const emptyState = screen.getByRole('listitem')
        const emptyIcon = screen.getByRole('img', { name: /no events/i })
        expect(emptyIcon).toBeInTheDocument()
    })

    test('should handle compact mode with expandable details', () => {
        render(<Timeline events={mockEvents} viewMode="compact" />)

        // Check that details are initially hidden in compact mode
        const details = screen.queryByText(/all systems operational/i)
        expect(details).not.toBeInTheDocument()

        // Find expand icon and click it
        const expandIcon = screen.getByRole('img', { name: /expand details/i })
        fireEvent.click(expandIcon)

        // Wait for details to expand
        waitFor(() => {
            const expandedDetails = screen.getByText(/all systems operational/i)
            expect(expandedDetails).toBeInTheDocument()
        })

        // Check that expand icon now shows collapse
        const collapseIcon = screen.getByRole('img', { name: /collapse details/i })
        expect(collapseIcon).toBeInTheDocument()
    })

    test('should handle empty state properly', () => {
        render(<Timeline events={[]} />)

        // Check empty state is rendered
        const emptyState = screen.getByText(/no events to display/i)
        expect(emptyState).toBeInTheDocument()

        // Check empty state has proper structure
        const emptyItem = screen.getByRole('listitem')
        expect(emptyItem).toBeInTheDocument()
    })
})

describe('Timeline Component Functionality', () => {
    test('should call onEventClick when event is clicked', () => {
        const handleClick = jest.fn()
        render(<Timeline events={mockEvents} onEventClick={handleClick} />)

        const eventCards = screen.getAllByRole('button')
        fireEvent.click(eventCards[0])

        expect(handleClick).toHaveBeenCalledTimes(1)
        expect(handleClick).toHaveBeenCalledWith(mockEvents[0])
    })

    test('should auto-scroll when autoScroll is true', () => {
        const scrollIntoView = jest.fn()
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            value: scrollIntoView,
            configurable: true,
        })

        render(<Timeline events={mockEvents} autoScroll={true} />)

        expect(scrollIntoView).toHaveBeenCalled()
    })

    test('should limit events to maxEvents', () => {
        const manyEvents: TimelineEvent[] = Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            timestamp: new Date(),
            title: `Event ${i}`,
            type: 'info',
        }))

        render(<Timeline events={manyEvents} maxEvents={10} />)

        const eventItems = screen.getAllByRole('listitem')
        expect(eventItems).toHaveLength(10) // Should be limited to maxEvents
    })
})

describe('ActivityFeed Component', () => {
    test('should render Timeline with events', () => {
        const mockFeedEvents: TimelineEvent[] = [
            {
                id: 'feed-event-1',
                timestamp: new Date(),
                title: 'Feed Event',
                type: 'success',
            },
        ]

        render(<ActivityFeed events={mockFeedEvents} />)

        const timeline = screen.getByRole('list')
        expect(timeline).toBeInTheDocument()
    })

    test('should call onNewEvent when new event is added', () => {
        const onNewEvent = jest.fn()
        render(<ActivityFeed events={[]} onNewEvent={onNewEvent} />)

        // Wait for simulated event to be added (30 seconds in real implementation)
        // For test, we can mock the interval to be faster
        jest.useFakeTimers()
        jest.runOnlyPendingTimers()

        expect(onNewEvent).toHaveBeenCalled()
    })
})