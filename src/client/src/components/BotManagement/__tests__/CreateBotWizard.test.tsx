import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// apiService mock
//
// These tests focus on the typed `apiService.{get,post}` call sites in the
// wizard (personas, llmProfiles, guardProfiles, AI generation result). The
// mock returns the historical/dynamic envelope shapes the component unwraps
// so we can assert the typing change preserved runtime behavior exactly.
// ---------------------------------------------------------------------------
const getMock = vi.fn();
const postMock = vi.fn();
const getPersonasMock = vi.fn();
const getLlmProfilesMock = vi.fn();

vi.mock('../../../services/api', () => ({
  apiService: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    getPersonas: (...args: unknown[]) => getPersonasMock(...args),
    getLlmProfiles: (...args: unknown[]) => getLlmProfilesMock(...args),
  },
}));

// ---------------------------------------------------------------------------
// Presentational child mocks
//
// Modal -> render children when open.
// StepWizard -> render the active step's content plus a button that invokes
//   onComplete, so we can drive the wizard to submission without simulating
//   multi-step navigation.
// LlmTestChat -> inert (avoids unrelated network/render concerns).
// ---------------------------------------------------------------------------
type StepLike = { id: string; content: React.ReactNode };

vi.mock('../../DaisyUI/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
}));

vi.mock('../../DaisyUI/StepWizard', () => ({
  __esModule: true,
  default: ({
    steps,
    onComplete,
  }: {
    steps: StepLike[];
    onComplete?: () => void;
  }) => (
    <div data-testid="step-wizard">
      {steps.map((s) => (
        <div key={s.id} data-step={s.id}>
          {s.content}
        </div>
      ))}
      <button type="button" onClick={() => onComplete?.()}>
        complete-wizard
      </button>
    </div>
  ),
}));

vi.mock('../../LlmTestChat', () => ({
  __esModule: true,
  default: () => <div data-testid="llm-test-chat" />,
}));

import { CreateBotWizard } from '../CreateBotWizard';

const flushFetches = async () => {
  await waitFor(() => {
    expect(getPersonasMock).toHaveBeenCalled();
    expect(getLlmProfilesMock).toHaveBeenCalled();
  });
};

describe('CreateBotWizard typed apiService integration', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    getPersonasMock.mockReset();
    getLlmProfilesMock.mockReset();

    // Guard profiles: { success, data } envelope.
    getMock.mockImplementation((endpoint: string) => {
      if (endpoint === '/api/admin/guard-profiles') {
        return Promise.resolve({
          success: true,
          data: [{ id: 'guard-1', name: 'Strict Guard' }],
        });
      }
      if (endpoint === '/api/config/llm-status') {
        return Promise.resolve({ defaultConfigured: true });
      }
      return Promise.resolve({});
    });

    // Personas: bare array (Persona[] shape).
    getPersonasMock.mockResolvedValue([
      { id: 'persona-1', name: 'Helper', description: 'A helpful persona' },
    ]);

    // LLM profiles: legacy `{ llm: [...] }` envelope the component unwraps.
    getLlmProfilesMock.mockResolvedValue({
      llm: [{ id: 'llm-1', name: 'GPT', provider: 'openai' }],
    });

    postMock.mockResolvedValue({ success: true, data: {} });
  });

  it('fetches guard profiles, personas, llm profiles and llm status on mount', async () => {
    render(<CreateBotWizard isOpen onClose={vi.fn()} />);
    await flushFetches();

    expect(getMock).toHaveBeenCalledWith('/api/admin/guard-profiles');
    expect(getMock).toHaveBeenCalledWith('/api/config/llm-status');
    expect(getPersonasMock).toHaveBeenCalledTimes(1);
    expect(getLlmProfilesMock).toHaveBeenCalledTimes(1);
  });

  it('renders fetched persona, llm profile and guard profile options', async () => {
    render(<CreateBotWizard isOpen onClose={vi.fn()} />);
    await flushFetches();

    // Persona option (from bare-array response).
    await waitFor(() => expect(screen.getByText('Helper')).toBeInTheDocument());
    // LLM profile option label `${name} (${provider})` (from { llm: [...] } envelope).
    expect(screen.getByText('GPT (openai)')).toBeInTheDocument();
    // Guard profile option (from { success, data } envelope).
    expect(screen.getByText('Strict Guard')).toBeInTheDocument();
  });

  it('submits a correctly shaped payload through onSubmit on completion', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CreateBotWizard isOpen onClose={onClose} onSubmit={onSubmit} />);
    await flushFetches();

    fireEvent.click(screen.getByText('complete-wizard'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: '',
      persona: 'default',
      mcpGuardProfile: '',
      config: {
        mcpGuard: { enabled: false },
        rateLimit: { enabled: false },
        contentFilter: { enabled: false },
      },
    });
    // maxTokensPerDay of 0 collapses to undefined (unlimited).
    expect(payload.maxTokensPerDay).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
  });

  it('calls apiService.post with the AI-generation endpoint and typed body', async () => {
    // Return an unsuccessful envelope so the (separately) rendered result panel
    // is not exercised here — this test pins the typed POST call site only.
    postMock.mockResolvedValueOnce({ success: false });

    render(<CreateBotWizard isOpen onClose={vi.fn()} />);
    await flushFetches();

    // Open AI modal and trigger generation.
    fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }));
    const textarea = await screen.findByPlaceholderText(/proactive DevOps assistant/i);
    fireEvent.change(textarea, { target: { value: 'a monitoring bot' } });
    fireEvent.click(screen.getByRole('button', { name: /generate persona/i }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/bots/generate-config', {
        description: 'a monitoring bot',
      }),
    );
  });
});
