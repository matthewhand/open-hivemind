/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TemplatesPage from '../../../../src/client/src/pages/TemplatesPage';
import { apiService } from '../../../../src/client/src/services/api';
import * as usePageLifecycleModule from '../../../../src/client/src/hooks/usePageLifecycle';
import { ToastProvider } from '../../../../src/client/src/components/DaisyUI/ToastNotification';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock DaisyUI components using a Proxy to handle all named exports
jest.mock('../../../../src/client/src/components/DaisyUI', () => {
  const React = require('react');
  const MockComponent = React.forwardRef(({ children, label, title, description, message, ...props }: any, ref: any) => {
    return (
      <div ref={ref} {...props}>
        {title && <div>{title}</div>}
        {description && <div>{description}</div>}
        {message && <div>{message}</div>}
        {label && <label>{label}</label>}
        {children}
      </div>
    );
  });
  
  // Add sub-components
  (MockComponent as any).Title = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  (MockComponent as any).Actions = ({ children, ...props }: any) => <div {...props}>{children}</div>;

  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === '__esModule') return true;
      return MockComponent;
    }
  });
});

// Mock PageHeader
jest.mock('../../../../src/client/src/components/DaisyUI/PageHeader', () => ({
  __esModule: true,
  default: ({ title, description }: any) => (
    <div><h1>{title}</h1><p>{description}</p></div>
  ),
}));

jest.mock('../../../../src/client/src/hooks/useApiQuery', () => ({
  useApiQuery: jest.fn(),
}));

jest.mock('../../../../src/client/src/services/api');
jest.mock('../../../../src/client/src/hooks/usePageLifecycle', () => ({
  usePageLifecycle: jest.fn(() => ({
    data: {},
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_target: any, prop: string) => {
      const Icon = (props: any) => {
        const React = require('react');
        return React.createElement('svg', { ...props, 'data-testid': `icon-${prop}` });
      };
      Icon.displayName = prop;
      return Icon;
    },
  });
});

// Mock ToastNotification
jest.mock('../../../../src/client/src/components/DaisyUI/ToastNotification', () => ({
  ToastProvider: ({ children }: any) => <div>{children}</div>,
  useSuccessToast: () => jest.fn(),
  useErrorToast: () => jest.fn(),
}));

const createQueryClient = (data: any) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        initialData: data,
      },
    },
  });
};

const renderWithRouter = (component: React.ReactElement, templates: any[] = []) => {
  const queryClient = createQueryClient(templates);
  
  const { useApiQuery } = require('../../../../src/client/src/hooks/useApiQuery');
  (useApiQuery as jest.Mock).mockReturnValue({
    data: { success: true, data: { templates } }, // FULL STRUCTURE
    loading: false,
    error: null,
    refetch: jest.fn(),
  });

  (usePageLifecycleModule.usePageLifecycle as jest.Mock).mockReturnValue({
    data: {},
    loading: false,
    error: null,
    refetch: jest.fn(),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>{component}</ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TemplatesPage', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Template 1',
      description: 'Description 1',
      category: 'discord',
      tags: ['tag1'],
      config: {},
      isBuiltIn: true,
      usageCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'template-2',
      name: 'Template 2',
      description: 'Description 2',
      category: 'slack',
      tags: ['tag2'],
      config: {},
      isBuiltIn: false,
      usageCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getBots as jest.Mock).mockResolvedValue([]);
  });

  it('should render page title and description', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);
    await waitFor(() => {
      expect(screen.getByText('Configuration Templates')).toBeInTheDocument();
      expect(screen.getByText(/Browse and apply pre-built bot configuration templates/i)).toBeInTheDocument();
    });
  });

  it('should display templates', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);
    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });
  });
});
