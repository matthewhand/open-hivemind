/**
 * @jest-environment jsdom
 */
import 'jest-axe/extend-expect';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from './setup';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
import Modal, {
  ConfirmModal,
  SuccessModal,
  ErrorModal,
  LoadingModal,
  InfoModal,
} from '../../src/client/src/components/DaisyUI/Modal';
import KeyboardShortcutsHelp from '../../src/client/src/components/KeyboardShortcutsHelp';
import CommandPalette from '../../src/client/src/components/CommandPalette';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility: Modal / Dialog Components', () => {
  // ── Base Modal ─────────────────────────────────────────────────────────
  describe('Modal (base)', () => {
    it('has no axe violations when open', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
          <p>Modal body content</p>
        </Modal>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders with dialog element', () => {
      render(
        <Modal isOpen={true} onClose={jest.fn()} title="Dialog Test">
          <p>Content</p>
        </Modal>,
      );
      const dialog = document.querySelector('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('close button has accessible label', () => {
      render(
        <Modal isOpen={true} onClose={jest.fn()} title="Close Test">
          <p>Content</p>
        </Modal>,
      );
      const closeBtn = screen.getByLabelText('Close modal');
      expect(closeBtn).toBeInTheDocument();
    });

    it('title is rendered as a heading', () => {
      render(
        <Modal isOpen={true} onClose={jest.fn()} title="My Title">
          <p>Body</p>
        </Modal>,
      );
      expect(screen.getByText('My Title')).toBeInTheDocument();
      const heading = screen.getByText('My Title');
      expect(heading.tagName).toBe('H3');
    });

    it('action buttons are keyboard accessible', () => {
      const onAction = jest.fn();
      render(
        <Modal
          isOpen={true}
          onClose={jest.fn()}
          title="Actions Test"
          actions={[
            { label: 'Save', onClick: onAction, variant: 'primary' },
            { label: 'Cancel', onClick: jest.fn(), variant: 'ghost' },
          ]}
        >
          <p>Body</p>
        </Modal>,
      );
      const saveBtn = screen.getByText('Save');
      expect(saveBtn.tagName).toBe('BUTTON');
      fireEvent.click(saveBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('disabled action button has disabled attribute', () => {
      render(
        <Modal
          isOpen={true}
          onClose={jest.fn()}
          title="Disabled test"
          actions={[
            { label: 'Submit', onClick: jest.fn(), disabled: true },
          ]}
        >
          <p>Body</p>
        </Modal>,
      );
      const btn = screen.getByText('Submit');
      expect(btn).toBeDisabled();
    });
  });

  // ── ConfirmModal ───────────────────────────────────────────────────────
  describe('ConfirmModal', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          message="Are you sure you want to delete this?"
          title="Confirm Delete"
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders confirm and cancel buttons', () => {
      render(
        <ConfirmModal
          isOpen={true}
          onClose={jest.fn()}
          onConfirm={jest.fn()}
          message="Delete this item?"
          confirmText="Delete"
          cancelText="Keep"
        />,
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  // ── SuccessModal ───────────────────────────────────────────────────────
  describe('SuccessModal', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <SuccessModal
          isOpen={true}
          onClose={jest.fn()}
          message="Operation completed successfully"
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── ErrorModal ─────────────────────────────────────────────────────────
  describe('ErrorModal', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <ErrorModal
          isOpen={true}
          onClose={jest.fn()}
          message="Something went wrong"
          error="Connection timeout"
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders retry button when onRetry is provided', () => {
      render(
        <ErrorModal
          isOpen={true}
          onClose={jest.fn()}
          onRetry={jest.fn()}
          message="Failed to load"
        />,
      );
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  // ── LoadingModal ───────────────────────────────────────────────────────
  describe('LoadingModal', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <LoadingModal
          isOpen={true}
          onClose={jest.fn()}
          message="Processing..."
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('loading spinner is hidden from screen readers', () => {
      const { container } = render(
        <LoadingModal isOpen={true} onClose={jest.fn()} />,
      );
      const spinner = container.querySelector('.loading-spinner');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ── InfoModal ──────────────────────────────────────────────────────────
  describe('InfoModal', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <InfoModal
          isOpen={true}
          onClose={jest.fn()}
          message="Here is some information"
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ── KeyboardShortcutsHelp (dialog) ─────────────────────────────────────
  describe('KeyboardShortcutsHelp', () => {
    const shortcuts = [
      { key: 'k', ctrlKey: true, description: 'Open command palette', action: jest.fn() },
      { key: 'Escape', ctrlKey: false, description: 'Close dialog', action: jest.fn() },
    ];

    it('has no axe violations when open', async () => {
      const { container } = render(
        <KeyboardShortcutsHelp isOpen={true} onClose={jest.fn()} shortcuts={shortcuts} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has role="dialog" with aria-label', () => {
      render(
        <KeyboardShortcutsHelp isOpen={true} onClose={jest.fn()} shortcuts={shortcuts} />,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts');
    });

    it('close button has accessible label', () => {
      render(
        <KeyboardShortcutsHelp isOpen={true} onClose={jest.fn()} shortcuts={shortcuts} />,
      );
      const closeBtn = screen.getByLabelText('Close shortcuts help');
      expect(closeBtn).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      const { container } = render(
        <KeyboardShortcutsHelp isOpen={false} onClose={jest.fn()} shortcuts={shortcuts} />,
      );
      expect(container.innerHTML).toBe('');
    });
  });

  // ── CommandPalette (dialog) ────────────────────────────────────────────
  describe('CommandPalette', () => {
    it('has no axe violations when open', async () => {
      const { container } = render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has role="dialog" with aria-label', () => {
      render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'Command palette');
    });

    it('search input has accessible label', () => {
      render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      const input = screen.getByLabelText('Command palette search');
      expect(input).toBeInTheDocument();
    });

    it('results list has role="listbox"', () => {
      render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
    });

    it('list items have role="option" with aria-selected', () => {
      render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      // First option should be selected by default
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('Escape key calls onClose', () => {
      const onClose = jest.fn();
      render(
        <MemoryRouter>
          <CommandPalette isOpen={true} onClose={onClose} />
        </MemoryRouter>,
      );
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });

    it('does not render when closed', () => {
      const { container } = render(
        <MemoryRouter>
          <CommandPalette isOpen={false} onClose={jest.fn()} />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
