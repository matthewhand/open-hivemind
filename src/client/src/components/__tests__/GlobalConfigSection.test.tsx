import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import GlobalConfigSection from '../GlobalConfigSection';

describe('GlobalConfigSection', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  it('renders a gracefully handled empty state when configuration section is not found', async () => {
    // Mock the API to return data that doesn't include the 'testSection'
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        otherSection: { values: {}, schema: {} }
      }),
    });

    render(<GlobalConfigSection section="testSection" />);

    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Loading settings.../i)).not.toBeInTheDocument();
    });

    // Check that the empty state alert is shown
    expect(screen.getByText("Configuration section 'testSection' not found in global config.")).toBeInTheDocument();
    expect(screen.getByText("Configuration section 'testSection' not found in global config.")).toHaveClass('alert-info');
  });
});
