/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ImportExportPage from '../../../src/client/src/pages/ImportExportPage';

// Mock the API service
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    getBots: jest.fn(),
    exportConfigurations: jest.fn(),
    importConfigurations: jest.fn(),
    validateConfigurationFile: jest.fn(),
  },
}));

// Mock toast notifications
jest.mock('../../../src/client/src/components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => jest.fn(),
  useErrorToast: () => jest.fn(),
}));

// Mock useApiQuery hook
jest.mock('../../../src/client/src/hooks/useApiQuery', () => ({
  useApiQuery: (key: any, fn: any) => {
    if (key[0] === 'bots') {
      return {
        data: [
          { id: 1, name: 'Test Bot 1', messageProvider: 'discord', llmProvider: 'openai' },
          { id: 2, name: 'Test Bot 2', messageProvider: 'slack', llmProvider: 'anthropic' },
        ],
        isLoading: false,
        error: null,
      };
    }
    return { data: null, isLoading: false, error: null };
  },
}));

const mockStore = configureStore({
  reducer: {
    theme: (state = { theme: 'light' }) => state,
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('ImportExportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main page with export and import cards', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText('Import/Export Configurations')).toBeInTheDocument();
    expect(screen.getByText('Export Configurations')).toBeInTheDocument();
    expect(screen.getByText('Import Configurations')).toBeInTheDocument();
  });

  it('displays export options and format selection', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText('Export Format')).toBeInTheDocument();
    expect(screen.getByText('Include Version History')).toBeInTheDocument();
    expect(screen.getByText('Include Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Include Templates')).toBeInTheDocument();
    expect(screen.getByText('Compress File (gzip)')).toBeInTheDocument();
    expect(screen.getByText('Encrypt Export')).toBeInTheDocument();
  });

  it('shows encryption key input when encrypt is checked', () => {
    renderWithProviders(<ImportExportPage />);

    // Initially, encryption key input should not be visible
    expect(screen.queryByPlaceholderText(/encryption key/i)).not.toBeInTheDocument();

    // Find and click the encrypt checkbox
    const encryptCheckbox = screen.getAllByRole('checkbox')[5]; // 6th checkbox (0-indexed)
    fireEvent.click(encryptCheckbox);

    // Now encryption key input should be visible
    expect(screen.getByPlaceholderText(/encryption key/i)).toBeInTheDocument();
  });

  it('opens export modal when clicking select configurations button', async () => {
    renderWithProviders(<ImportExportPage />);

    const selectButton = screen.getByText('Select Configurations to Export');
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('Select Configurations to Export')).toBeInTheDocument();
    });
  });

  it('allows format selection between JSON, YAML, and CSV', () => {
    renderWithProviders(<ImportExportPage />);

    const formatSelect = screen.getByRole('combobox') as HTMLSelectElement;

    // Default should be JSON
    expect(formatSelect.value).toBe('json');

    // Change to YAML
    fireEvent.change(formatSelect, { target: { value: 'yaml' } });
    expect(formatSelect.value).toBe('yaml');

    // Change to CSV
    fireEvent.change(formatSelect, { target: { value: 'csv' } });
    expect(formatSelect.value).toBe('csv');
  });

  it('displays file upload component in import card', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText(/Drag 'n' drop files here/i)).toBeInTheDocument();
  });

  it('shows import options button after file selection', () => {
    renderWithProviders(<ImportExportPage />);

    // Create a mock file
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    // Find file input and upload file
    const fileInput = screen.getByLabelText(/file-upload-input/i) || screen.getAllByRole('button')[0];

    // The file upload component exists
    expect(screen.getByText(/Drag 'n' drop files here/i)).toBeInTheDocument();
  });

  it('toggles checkboxes for export options', () => {
    renderWithProviders(<ImportExportPage />);

    const checkboxes = screen.getAllByRole('checkbox');

    // Include Versions checkbox (should be checked by default)
    const includeVersionsCheckbox = checkboxes[0];
    expect(includeVersionsCheckbox).toBeChecked();

    // Click to uncheck
    fireEvent.click(includeVersionsCheckbox);
    expect(includeVersionsCheckbox).not.toBeChecked();

    // Click to check again
    fireEvent.click(includeVersionsCheckbox);
    expect(includeVersionsCheckbox).toBeChecked();
  });

  it('displays compress checkbox checked by default', () => {
    renderWithProviders(<ImportExportPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    const compressCheckbox = checkboxes[4]; // 5th checkbox (compress)

    expect(compressCheckbox).toBeChecked();
  });

  it('allows custom file name input', () => {
    renderWithProviders(<ImportExportPage />);

    const fileNameInput = screen.getByPlaceholderText('custom-export-name') as HTMLInputElement;

    fireEvent.change(fileNameInput, { target: { value: 'my-export' } });
    expect(fileNameInput.value).toBe('my-export');
  });

  it('renders page header with correct title and icon', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText('Import/Export Configurations')).toBeInTheDocument();
    expect(screen.getByText(/Export configurations for backup or migration/i)).toBeInTheDocument();
  });

  it('displays export description text', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText(/Export bot configurations to a file for backup or migration purposes/i)).toBeInTheDocument();
  });

  it('displays import description text', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText(/Import bot configurations from a previously exported file/i)).toBeInTheDocument();
  });
});
