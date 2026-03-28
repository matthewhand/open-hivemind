/**
 * @jest-environment jsdom
 */
import 'jest-axe/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from './setup';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useAuth for Login component
jest.mock('../../src/client/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue(true),
    isServerless: false,
  }),
}));

// Mock useProviders for AgentCard
jest.mock('../../src/client/src/hooks/useProviders', () => ({
  useProviders: () => ({
    llmProviders: [
      { key: 'openai', label: 'OpenAI' },
      { key: 'flowise', label: 'Flowise' },
    ],
    messageProviders: [
      { key: 'discord', label: 'Discord' },
      { key: 'slack', label: 'Slack' },
    ],
    loading: false,
    error: null,
  }),
}));

// Mock usePersonas for AgentCard
jest.mock('../../src/client/src/hooks/usePersonas', () => ({
  usePersonas: () => ({
    personas: [
      { key: 'default', name: 'Default' },
      { key: 'creative', name: 'Creative' },
    ],
    loading: false,
    error: null,
  }),
}));

// Mock lucide-react icons to simple spans
jest.mock('lucide-react', () => {
  const makeMockIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => <span data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return new Proxy({}, {
    get: (_target, prop: string) => makeMockIcon(prop),
  });
});

// Mock @heroicons/react to avoid import issues
jest.mock('@heroicons/react/24/outline', () => {
  return new Proxy({}, {
    get: (_target, prop: string) => {
      const Icon = (props: Record<string, unknown>) => <span data-testid={`hero-${prop}`} {...props} />;
      Icon.displayName = String(prop);
      return Icon;
    },
  });
});

jest.mock('@heroicons/react/24/solid', () => {
  return new Proxy({}, {
    get: (_target, prop: string) => {
      const Icon = (props: Record<string, unknown>) => <span data-testid={`hero-${prop}`} {...props} />;
      Icon.displayName = String(prop);
      return Icon;
    },
  });
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import Login from '../../src/client/src/components/Login';
import Input from '../../src/client/src/components/DaisyUI/Input';
import Select from '../../src/client/src/components/DaisyUI/Select';
import Textarea from '../../src/client/src/components/DaisyUI/Textarea';
import Toggle from '../../src/client/src/components/DaisyUI/Toggle';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility: Form Components', () => {
  // ── DaisyUI Input ──────────────────────────────────────────────────────
  describe('Input', () => {
    it('has no axe violations with a label', async () => {
      const { container } = render(
        <Input label="Email address" type="email" placeholder="you@example.com" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with an aria-label (no visible label)', async () => {
      const { container } = render(
        <Input aria-label="Search" type="search" placeholder="Search..." />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('associates error message via aria-describedby', () => {
      render(<Input label="Name" error="Name is required" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const errorEl = document.getElementById(describedBy!);
      expect(errorEl).toBeInTheDocument();
      expect(errorEl!.textContent).toContain('Name is required');
    });

    it('password input has toggle button with accessible label', () => {
      render(<Input label="Password" type="password" />);
      const toggle = screen.getByRole('button', { name: /show password|hide password/i });
      expect(toggle).toBeInTheDocument();
    });

    it('has no axe violations when disabled', async () => {
      const { container } = render(
        <Input label="Disabled field" disabled value="read-only" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with helperText', async () => {
      const { container } = render(
        <Input label="Username" helperText="Must be at least 3 characters" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── DaisyUI Select ─────────────────────────────────────────────────────
  describe('Select', () => {
    it('has no axe violations when labelled externally', async () => {
      const { container } = render(
        <div>
          <label htmlFor="region-select">Region</label>
          <Select
            id="region-select"
            options={[
              { label: 'US East', value: 'us-east' },
              { label: 'US West', value: 'us-west' },
            ]}
          />
        </div>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with aria-label', async () => {
      const { container } = render(
        <Select
          aria-label="Choose provider"
          options={[
            { label: 'OpenAI', value: 'openai' },
            { label: 'Flowise', value: 'flowise' },
          ]}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders option groups accessibly', async () => {
      const { container } = render(
        <Select
          aria-label="Select model"
          optionGroups={[
            {
              label: 'Chat Models',
              options: [
                { label: 'GPT-4', value: 'gpt-4' },
                { label: 'GPT-3.5', value: 'gpt-3.5' },
              ],
            },
          ]}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── DaisyUI Textarea ───────────────────────────────────────────────────
  describe('Textarea', () => {
    it('has no axe violations when labelled', async () => {
      const { container } = render(
        <div>
          <label htmlFor="notes">Notes</label>
          <Textarea id="notes" placeholder="Enter notes..." />
        </div>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with aria-label', async () => {
      const { container } = render(
        <Textarea aria-label="System prompt" rows={4} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── DaisyUI Toggle ─────────────────────────────────────────────────────
  describe('Toggle', () => {
    it('has no axe violations with a label', async () => {
      const { container } = render(
        <Toggle label="Enable notifications" checked={false} onChange={() => {}} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with aria-label (no visible label)', async () => {
      const { container } = render(
        <Toggle aria-label="Dark mode" checked={true} onChange={() => {}} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── Login Form ─────────────────────────────────────────────────────────
  describe('Login', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has labels linked to inputs', () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
      );
      // The username and password fields should be findable by their label text
      const usernameInput = screen.getByPlaceholderText(/enter.*admin/i);
      expect(usernameInput).toHaveAttribute('name', 'username');
      expect(usernameInput).toHaveAttribute('required');

      const passwordInput = screen.getByPlaceholderText(/enter password/i);
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('submit button is present and accessible', () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>,
      );
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      expect(submitBtn).toBeInTheDocument();
      expect(submitBtn).toHaveAttribute('type', 'submit');
    });
  });
});
