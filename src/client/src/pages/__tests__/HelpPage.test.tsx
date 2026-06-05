import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import HelpPage from '../HelpPage';

// PageHeader renders Breadcrumbs, which calls useLocation(), so a router is
// required. HelpPage itself needs no other context, API, or store mocks.
const renderHelpPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/help']}>
      <HelpPage />
    </MemoryRouter>
  );

/**
 * These tests guard the content that docs/USER_GUIDE.md documents for the
 * Help & FAQ page (/admin/help): the FAQ section, the Getting Started steps,
 * and the Keyboard Shortcuts reference. If the page content drifts, the docs
 * (and the screenshots they embed) go stale — these assertions catch that.
 *
 * HelpPage is purely presentational, so it renders with only a router (for the
 * breadcrumb) and needs no context, store, or API mocks.
 */
describe('HelpPage', () => {
  it('renders the page header and the two top-level sections', () => {
    renderHelpPage();

    expect(
      screen.getByRole('heading', { name: 'Help & FAQ', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Frequently Asked Questions/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Keyboard Shortcuts/i })
    ).toBeInTheDocument();
  });

  it('renders every documented FAQ question', () => {
    renderHelpPage();

    const expectedQuestions = [
      'What is Open-Hivemind?',
      'How do I get started?',
      'How does the bot decide when to respond?',
      'Can I run multiple bots at once?',
      'Which LLM providers are supported?',
      'What are Guard Profiles?',
      'What are MCP Servers?',
      'Should I configure via .env or the WebUI?',
    ];

    for (const question of expectedQuestions) {
      expect(screen.getByText(question)).toBeInTheDocument();
    }
  });

  it('documents the four Getting Started steps', () => {
    renderHelpPage();

    // The accordion keeps all content in the DOM, so the step copy is queryable.
    // Match distinctive phrases from each step's body so the assertions don't
    // collide with the short <strong> labels or the navigation shortcuts.
    expect(
      screen.getByText(/add your OpenAI API key/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/create a personality for your bot/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/assigning it a persona and message provider/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Add your platform tokens/i)).toBeInTheDocument();
  });

  it('lists the supported LLM providers as badges', () => {
    renderHelpPage();

    for (const provider of ['OpenAI', 'Anthropic', 'Flowise', 'Ollama']) {
      expect(screen.getByText(provider)).toBeInTheDocument();
    }
  });

  it('exposes the documented keyboard shortcut groups and bindings', () => {
    renderHelpPage();

    // Group headings within the shortcuts accordion.
    expect(screen.getByRole('heading', { name: 'Global' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeInTheDocument();

    // A representative binding from each group.
    expect(screen.getByText('Command palette')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Create new bot')).toBeInTheDocument();
  });

  it('renders the keyboard shortcut content open by default', () => {
    const { container } = renderHelpPage();

    // The shortcuts accordion uses defaultOpenItems, so its checkbox is checked
    // and the bindings are visible without interaction.
    const shortcutsHeading = screen.getByRole('heading', {
      name: /Keyboard Shortcuts/i,
    });
    const shortcutsCard = shortcutsHeading.closest('.card') ?? container;
    const checkbox = within(shortcutsCard as HTMLElement).getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });
});
