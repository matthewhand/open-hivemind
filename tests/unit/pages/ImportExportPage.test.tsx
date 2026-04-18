/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ImportExportPage from '../../../src/client/src/pages/ImportExportPage';

// Mock lucide-react
jest.mock('lucide-react', () => {
  const React = require('react');
  const MockIcon = (props: any) => React.createElement('div', props);
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      return MockIcon;
    }
  });
});

// Mock DaisyUI components using a Proxy to handle all named exports
jest.mock('../../../src/client/src/components/DaisyUI', () => {
  const React = require('react');
  const MockComponent = React.forwardRef(({ children, label, checked, onChange, isOpen, ...props }: any, ref: any) => {
    // Special handling for some components to satisfy test selectors
    if (props.type === 'checkbox' || label !== undefined) {
       return (
         <label>
           <input type="checkbox" checked={checked} onChange={onChange} ref={ref} {...props} />
           {label}
           {children}
         </label>
       );
    }
    return React.createElement('div', { ref, ...props }, children);
  });
  
  // Add sub-components to mocks that need them
  (MockComponent as any).Title = ({ children, ...props }: any) => React.createElement('div', props, children);
  (MockComponent as any).Actions = ({ children, ...props }: any) => React.createElement('div', props, children);

  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      return MockComponent;
    }
  });
});

// Mock PageHeader separately
jest.mock('../../../src/client/src/components/DaisyUI/PageHeader', () => ({
  __esModule: true,
  default: ({ title, description }: any) => (
    <div><h1>{title}</h1><p>{description}</p></div>
  ),
}));

// Mock the API service
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    getBots: jest.fn().mockResolvedValue([]),
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

// Mock TanStack Query
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
    expect(screen.getByText('Import/Export Configurations')).toBeInTheDocument();
  });

  it('displays export options', () => {
    renderWithProviders(<ImportExportPage />);
    expect(screen.getByText('Export Format')).toBeInTheDocument();
  });
});
