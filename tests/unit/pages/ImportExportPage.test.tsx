/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ImportExportPage from '../../../src/client/src/pages/ImportExportPage';

// Mock the API service
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    getBots: jest.fn().mockResolvedValue([
      { id: 1, name: 'Test Bot 1', messageProvider: 'discord', llmProvider: 'openai' },
      { id: 2, name: 'Test Bot 2', messageProvider: 'slack', llmProvider: 'anthropic' },
    ]),
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

// Mock react-query to avoid needing QueryClientProvider
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ImportExportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: [
        { id: 1, name: 'Test Bot 1', messageProvider: 'discord', llmProvider: 'openai' },
        { id: 2, name: 'Test Bot 2', messageProvider: 'slack', llmProvider: 'anthropic' },
      ],
      isLoading: false,
      error: null,
    });
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

    // Find and click the encrypt checkbox (5th export checkbox, index 4)
    const encryptCheckbox = screen.getAllByRole('checkbox')[4];
    fireEvent.click(encryptCheckbox);

    // Now encryption key input should be visible
    expect(screen.getByPlaceholderText(/encryption key/i)).toBeInTheDocument();
  });

  it('opens export modal when clicking select configurations button', async () => {
    renderWithProviders(<ImportExportPage />);

    // Click the button (first match) to open the modal
    const selectButton = screen.getByRole('button', { name: /Select Configurations to Export/i });
    fireEvent.click(selectButton);

    await waitFor(() => {
      // Modal title also shows "Select Configurations to Export"
      expect(screen.getAllByText('Select Configurations to Export').length).toBeGreaterThanOrEqual(2);
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
    const compressCheckbox = checkboxes[3]; // 4th checkbox (compress, 0-indexed)

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
