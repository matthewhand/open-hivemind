import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const Probe = () => {
  const [v] = useLocalStorage('k', { a: 'default' });
  return <div data-testid="out">{JSON.stringify(v)}</div>;
};

describe('probe', () => {
  beforeEach(() => window.localStorage.clear());
  it('reads stored', () => {
    window.localStorage.setItem('k', JSON.stringify({ a: 'stored' }));
    render(<Probe />);
    expect(screen.getByTestId('out').textContent).toBe(JSON.stringify({ a: 'stored' }));
  });
});
