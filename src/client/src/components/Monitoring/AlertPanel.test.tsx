import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AlertPanel, { Alert } from './AlertPanel';

const baseTime = new Date('2026-06-02T12:00:00Z').toISOString();

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'alert-1',
  type: 'error',
  title: 'Database connection lost',
  message: 'Could not reach the primary database.',
  timestamp: baseTime,
  source: 'db-monitor',
  ...overrides,
});

describe('AlertPanel accessibility', () => {
  it('exposes a descriptive accessible name on the acknowledge button', () => {
    render(<AlertPanel alerts={[makeAlert()]} />);
    expect(
      screen.getByRole('button', { name: 'Acknowledge alert: Database connection lost' }),
    ).toBeInTheDocument();
  });

  it('exposes a descriptive accessible name on the resolve button', () => {
    render(<AlertPanel alerts={[makeAlert()]} />);
    expect(
      screen.getByRole('button', { name: 'Resolve alert: Database connection lost' }),
    ).toBeInTheDocument();
  });

  it('exposes a descriptive accessible name on the dismiss button', () => {
    render(<AlertPanel alerts={[makeAlert()]} />);
    expect(
      screen.getByRole('button', { name: 'Dismiss alert: Database connection lost' }),
    ).toBeInTheDocument();
  });

  it('labels accessible names with the specific alert title (disambiguates multiple alerts)', () => {
    render(
      <AlertPanel
        alerts={[
          makeAlert({ id: 'a', title: 'Alpha down' }),
          makeAlert({ id: 'b', title: 'Beta down' }),
        ]}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Dismiss alert: Alpha down' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dismiss alert: Beta down' }),
    ).toBeInTheDocument();
  });

  it('hides the decorative status icon from the accessibility tree', () => {
    const { container } = render(<AlertPanel alerts={[makeAlert()]} showFilters={false} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveAttribute('focusable', 'false');
    });
  });

  it('renders the alerts list as a labeled polite live region', () => {
    render(<AlertPanel alerts={[makeAlert()]} />);
    const region = screen.getByRole('region', { name: 'Alerts list' });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('gives the "Acknowledge All" control an unambiguous accessible name', () => {
    render(<AlertPanel alerts={[makeAlert()]} />);
    expect(
      screen.getByRole('button', { name: 'Acknowledge all unacknowledged alerts' }),
    ).toBeInTheDocument();
  });
});

describe('AlertPanel behavior', () => {
  it('invokes onAcknowledge with the alert id', () => {
    const onAcknowledge = vi.fn();
    render(<AlertPanel alerts={[makeAlert({ id: 'x1' })]} onAcknowledge={onAcknowledge} />);
    fireEvent.click(
      screen.getByRole('button', { name: /^Acknowledge alert:/ }),
    );
    expect(onAcknowledge).toHaveBeenCalledWith('x1');
  });

  it('invokes onResolve with the alert id', () => {
    const onResolve = vi.fn();
    render(<AlertPanel alerts={[makeAlert({ id: 'x2' })]} onResolve={onResolve} />);
    fireEvent.click(screen.getByRole('button', { name: /^Resolve alert:/ }));
    expect(onResolve).toHaveBeenCalledWith('x2');
  });

  it('removes the alert and invokes onDismiss when dismissed', () => {
    const onDismiss = vi.fn();
    render(<AlertPanel alerts={[makeAlert({ id: 'x3', title: 'Gone soon' })]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss alert: Gone soon' }));
    expect(onDismiss).toHaveBeenCalledWith('x3');
    expect(screen.queryByText('Gone soon')).not.toBeInTheDocument();
  });

  it('does not render acknowledge/resolve buttons once an alert is resolved', () => {
    render(<AlertPanel alerts={[makeAlert({ resolved: true })]} showFilters={false} />);
    expect(
      screen.queryByRole('button', { name: /^Acknowledge alert:/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Resolve alert:/ }),
    ).not.toBeInTheDocument();
    // Dismiss remains available.
    expect(screen.getByRole('button', { name: /^Dismiss alert:/ })).toBeInTheDocument();
  });

  it('shows an empty-state message inside the live region when there are no alerts', () => {
    render(<AlertPanel alerts={[]} />);
    const region = screen.getByRole('region', { name: 'Alerts list' });
    expect(within(region).getByText('No alerts found')).toBeInTheDocument();
  });
});
