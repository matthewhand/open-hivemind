/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider, useToast } from '../../../src/client/src/components/DaisyUI/ToastNotification';

// Helper component that exposes toast actions via buttons
const ToastTrigger: React.FC = () => {
  const { addToast, removeToast, clearAll, toasts } = useToast();

  return (
    <div>
      <button
        onClick={() => addToast({ type: 'success', title: 'Saved', message: 'Item saved' })}
      >
        Add Success
      </button>
      <button
        onClick={() => addToast({ type: 'error', title: 'Failed', message: 'Network error' })}
      >
        Add Error
      </button>
      <button
        onClick={() => addToast({ type: 'warning', title: 'Warn' })}
      >
        Add Warning
      </button>
      <button
        onClick={() => addToast({ type: 'info', title: 'Info', persistent: true })}
      >
        Add Persistent
      </button>
      <button onClick={clearAll}>Clear All</button>
      {toasts.length > 0 && (
        <button onClick={() => removeToast(toasts[0].id)}>Remove First</button>
      )}
      <span data-testid="count">{toasts.length}</span>
    </div>
  );
};

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <p>App content</p>
      </ToastProvider>,
    );
    expect(screen.getByText('App content')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    // Suppress console.error for expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Bad = () => { useToast(); return null; };
    expect(() => render(<Bad />)).toThrow('useToast must be used within a ToastProvider');
    spy.mockRestore();
  });

  it('adds a toast and displays it', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Item saved')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('adds multiple toasts of different types', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    fireEvent.click(screen.getByText('Add Error'));
    fireEvent.click(screen.getByText('Add Warning'));
    expect(screen.getByTestId('count')).toHaveTextContent('3');
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Warn')).toBeInTheDocument();
  });

  it('removes a toast by id', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('Remove First'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('clears all toasts', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    fireEvent.click(screen.getByText('Add Error'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('Clear All'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('respects maxToasts limit', () => {
    render(
      <ToastProvider maxToasts={2}>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    fireEvent.click(screen.getByText('Add Error'));
    fireEvent.click(screen.getByText('Add Warning'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
  });

  it('auto-dismisses after duration', () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    act(() => { jest.advanceTimersByTime(6000); });
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    jest.useRealTimers();
  });

  it('does not auto-dismiss persistent toasts', () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Persistent'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    act(() => { jest.advanceTimersByTime(10000); });
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    jest.useRealTimers();
  });

  it('toast close button has aria-label', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Add Success'));
    expect(screen.getByLabelText('Close notification')).toBeInTheDocument();
  });
});
