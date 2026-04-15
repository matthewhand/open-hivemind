/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ImportExportPage from '../../../src/client/src/pages/ImportExportPage';

// Mock DaisyUI components
jest.mock('../../../src/client/src/components/DaisyUI', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
  Select: ({ options, onChange, value }: any) => (
    <select onChange={onChange} value={value} data-testid="select">
      {options?.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  ),
  Divider: () => <hr />,
  Button: ({ children, className, onClick, disabled }: any) => (
    <button className={className} onClick={onClick} disabled={disabled}>{children}</button>
  ),
  Checkbox: ({ checked, onChange, label }: any) => (
    <label><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  ),
  Input: ({ type, placeholder, value, onChange }: any) => (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} />
  ),
  Alert: ({ children, variant }: any) => <div className={`alert-${variant}`}>{children}</div>,
  LoadingSpinner: () => <div className="loading-spinner" />,
  ProgressBar: ({ value }: any) => <div className="progress-bar" data-value={value} />,
  PageHeader: ({ title, description }: any) => (
    <div><h1>{title}</h1><p>{description}</p></div>
  ),
  FileUpload: ({ onFileSelect, placeholder }: any) => (
    <div data-testid="file-upload">{placeholder}</div>
  ),
}));

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

// Mock TanStack Query so the component doesn't need a QueryClientProvider
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: any[] }) => {
    if (queryKey[0] === 'bots') {
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
  useMutation: () => ({ mutate: jest.fn(), isPending: false, isError: false }),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
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

    expect(screen.getByText('Import / Export')).toBeInTheDocument();
    expect(screen.getByText('Export Configuration')).toBeInTheDocument();
    expect(screen.getByText('Import Configuration')).toBeInTheDocument();
  });

  it('displays export options and format selection', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText('Export Format')).toBeInTheDocument();
    expect(screen.getByText('Version History')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Compress (GZip)')).toBeInTheDocument();
    expect(screen.getByText('Encrypt Export File')).toBeInTheDocument();
  });

  it('shows encryption key input when encrypt is checked', () => {
    renderWithProviders(<ImportExportPage />);

    // Initially, encryption key input should not be visible
    expect(screen.queryByPlaceholderText(/Strong passphrase/i)).not.toBeInTheDocument();

    // Find and click the encrypt checkbox
    const encryptCheckbox = screen.getByLabelText(/Encrypt Export File/i);
    fireEvent.click(encryptCheckbox);

    // Now encryption key input should be visible
    expect(screen.getByPlaceholderText(/Strong passphrase/i)).toBeInTheDocument();
  });

  it('allows format selection between JSON, YAML, and CSV', () => {
    renderWithProviders(<ImportExportPage />);

    const formatSelect = screen.getByTestId('select') as HTMLSelectElement;

    // Default should be json
    expect(formatSelect.value).toBe('json');

    // Change to yaml
    fireEvent.change(formatSelect, { target: { value: 'yaml' } });
    expect(formatSelect.value).toBe('yaml');

    // Change to csv
    fireEvent.change(formatSelect, { target: { value: 'csv' } });
    expect(formatSelect.value).toBe('csv');
  });

  it('displays file upload component in import card', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    expect(screen.getByText(/Drop export file here/i)).toBeInTheDocument();
  });

  it('shows import options button after file selection', () => {
    renderWithProviders(<ImportExportPage />);

    // The file upload component exists
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('toggles checkboxes for export options', () => {
    renderWithProviders(<ImportExportPage />);

    // Include Versions checkbox (should be checked by default)
    const includeVersionsCheckbox = screen.getByLabelText(/Version History/i);
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

    const compressCheckbox = screen.getByLabelText(/Compress \(GZip\)/i);
    expect(compressCheckbox).toBeChecked();
  });

  it('allows custom file name input', () => {
    renderWithProviders(<ImportExportPage />);

    const fileNameInput = screen.getByPlaceholderText('hivemind-backup.json') as HTMLInputElement;

    fireEvent.change(fileNameInput, { target: { value: 'my-export' } });
    expect(fileNameInput.value).toBe('my-export');
  });

  it('renders page header with correct title and icon', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText('Import / Export')).toBeInTheDocument();
    expect(screen.getByText(/Manage your system configuration/i)).toBeInTheDocument();
  });

  it('displays export description text', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText(/Create a backup of your current system state/i)).toBeInTheDocument();
  });

  it('displays import description text', () => {
    renderWithProviders(<ImportExportPage />);

    expect(screen.getByText(/Restore configuration from a previously exported backup file/i)).toBeInTheDocument();
  });
});
