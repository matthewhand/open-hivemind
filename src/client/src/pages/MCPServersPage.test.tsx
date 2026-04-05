import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import { SavedStampProvider } from '../contexts/SavedStampContext';
import MCPServersPage from './MCPServersPage';
import { act } from 'react';

// Mock fetch
global.fetch = jest.fn();

// Mock Modal to avoid JSDOM issues with <dialog>
jest.mock('../components/DaisyUI/Modal', () => ({
  __esModule: true,
  default: ({ children, isOpen, title }: { children: React.ReactNode; isOpen: boolean; title?: string }) => (
    isOpen ? (
      <div role="dialog">
        {title && <h2>{title}</h2>}
        {children}
      </div>
    ) : null
  ),
}));

describe('MCPServersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HTMLDialogElement methods manually to ensure Modal works
    // Patch both HTMLElement (for JSDOM fallback) and HTMLDialogElement
    const mockShowModal = jest.fn();
    const mockClose = jest.fn();

    (HTMLElement.prototype as any).showModal = mockShowModal;
    (HTMLElement.prototype as any).close = mockClose;

    if (typeof window !== 'undefined' && window.HTMLDialogElement) {
      window.HTMLDialogElement.prototype.showModal = mockShowModal;
      window.HTMLDialogElement.prototype.close = mockClose;
    }

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          servers: [],
          configurations: [],
          trustedRepositories: [],
          cautionRepositories: []
        }
      })
    });
  });

  test('renders the page title', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SavedStampProvider>
            <MCPServersPage />
          </SavedStampProvider>
        </MemoryRouter>
      );
    });
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
  });

  test('opens add server modal and checks for API Key field', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SavedStampProvider>
            <MCPServersPage />
          </SavedStampProvider>
        </MemoryRouter>
      );
    });

    const addButtons = screen.getAllByText('Add Server');
    fireEvent.click(addButtons[0]);

    expect(screen.getByText('Add MCP Server')).toBeInTheDocument();

    // This assertion should fail if the API Key field is missing
    expect(screen.getByPlaceholderText('Leave blank if not required or unchanged')).toBeInTheDocument();
  });

  // Note: 'trusted repository' and 'handleServerAction' tests removed —
  // the page no longer uses configurations/trustedRepositories from the API response.
});
