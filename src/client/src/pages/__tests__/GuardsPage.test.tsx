import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import GuardsPage from '../GuardsPage';
import { apiService } from '../../services/api';
import { render as customRender } from '../../test-utils';

// Mock apiService
jest.mock('../../services/api', () => ({
  apiService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn().mockResolvedValue({ success: true }),
    delete: jest.fn(),
    getCsrfToken: jest.fn().mockResolvedValue('test-token'),
  },
}));

import { MemoryRouter } from 'react-router-dom';

// Mock router since we are using useUrlParams which uses useSearchParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  useNavigate: () => jest.fn(),
}));

// Mock Modal component
jest.mock('../../components/DaisyUI/Modal', () => {
  return ({ isOpen, children, title, actions }: any) => (
    isOpen ? (
      <div role="dialog" aria-modal="true">
        <h3>{title}</h3>
        {children}
        <div className="modal-action">
          {actions?.map((action: any, index: number) => (
            <button key={index} onClick={action.onClick}>{action.label}</button>
          ))}
        </div>
      </div>
    ) : null
  );
});

describe('GuardsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(apiService, 'get').mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Default Profile',
          description: 'Default config',
          guards: {
            mcpGuard: { enabled: true, type: 'owner', allowedUsers: [], allowedTools: [] },
            rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
            contentFilter: { enabled: true, strictness: 'medium', blockedTerms: [] },
          },
        }
      ]
    } as any);
    jest.spyOn(apiService, 'put').mockResolvedValue({ success: true } as any);
  });

  it('renders guards page and loads profiles', async () => {
    customRender(
      <MemoryRouter>
        <GuardsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Guard Profiles')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Default Profile')).toBeInTheDocument());
  });

  it('allows editing a guard profile with range sliders', async () => {
    customRender(
      <MemoryRouter>
        <GuardsPage />
      </MemoryRouter>
    );

    // Wait for the profile to load
    await waitFor(() => expect(screen.getByText('Default Profile')).toBeInTheDocument());

    // Click edit on the profile
    const editButtons = screen.getAllByRole('button', { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    // The modal should open
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    // Verify rate limit range slider is present and update it
    const rateLimitSlider = screen.getByLabelText(/Max Requests/i);
    expect(rateLimitSlider).toBeInTheDocument();
    fireEvent.change(rateLimitSlider, { target: { value: '200' } });

    // Verify content filter strictness slider is present and update it
    const strictnessSlider = screen.getByLabelText(/Strictness/i);
    expect(strictnessSlider).toBeInTheDocument();
    fireEvent.change(strictnessSlider, { target: { value: '2' } }); // value 2 corresponds to 'high'

    // Click save
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Verify API call was made with updated values
    await waitFor(() => {
      expect(apiService.put).toHaveBeenCalledWith(
        '/api/admin/guard-profiles/1',
        expect.objectContaining({
          guards: expect.objectContaining({
            rateLimit: expect.objectContaining({
              maxRequests: 200
            }),
            contentFilter: expect.objectContaining({
              strictness: 'high'
            })
          })
        })
      );
    });
  });
});
