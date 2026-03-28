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
import Breadcrumbs from '../../src/client/src/components/DaisyUI/Breadcrumbs';
import Menu from '../../src/client/src/components/DaisyUI/Menu';
import Pagination from '../../src/client/src/components/DaisyUI/Pagination';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility: Navigation Components', () => {
  // ── Breadcrumbs ────────────────────────────────────────────────────────
  describe('Breadcrumbs', () => {
    it('has no axe violations (manual mode)', async () => {
      const items = [
        { label: 'Admin', href: '/admin' },
        { label: 'Bots', href: '/admin/bots', isActive: true },
      ];
      const { container } = render(
        <MemoryRouter>
          <Breadcrumbs items={items} />
        </MemoryRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations (auto mode)', async () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/admin/bots/create']}>
          <Breadcrumbs />
        </MemoryRouter>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders as a <nav> landmark with aria-label', () => {
      render(
        <MemoryRouter initialEntries={['/admin/settings']}>
          <Breadcrumbs />
        </MemoryRouter>,
      );
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toBeInTheDocument();
    });

    it('marks the active page with aria-current="page"', () => {
      render(
        <MemoryRouter initialEntries={['/admin/bots']}>
          <Breadcrumbs />
        </MemoryRouter>,
      );
      const activePage = screen.getByText('Bots');
      const span = activePage.closest('span');
      expect(span).toHaveAttribute('aria-current', 'page');
    });

    it('non-active links do NOT have aria-current', () => {
      render(
        <MemoryRouter initialEntries={['/admin/bots']}>
          <Breadcrumbs />
        </MemoryRouter>,
      );
      const adminLink = screen.getByText('Admin');
      const closestSpan = adminLink.closest('span');
      const closestA = adminLink.closest('a');
      // The admin link should be an <a> tag, not have aria-current
      expect(closestA || closestSpan).not.toHaveAttribute('aria-current');
    });
  });

  // ── Menu ───────────────────────────────────────────────────────────────
  describe('Menu', () => {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <span aria-hidden="true">D</span>, active: true },
      { id: 'settings', label: 'Settings', icon: <span aria-hidden="true">S</span> },
      { id: 'disabled-item', label: 'Disabled', disabled: true },
      {
        id: 'parent',
        label: 'Sub Menu',
        children: [
          { id: 'child1', label: 'Child 1' },
          { id: 'child2', label: 'Child 2' },
        ],
      },
    ];

    it('has no axe violations', async () => {
      const { container } = render(<Menu items={menuItems} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('renders with role="menu" and aria-label', () => {
      render(<Menu items={menuItems} />);
      const menu = screen.getByRole('menu', { name: 'Navigation menu' });
      expect(menu).toBeInTheDocument();
    });

    it('menu items have role="menuitem" or role="button"', () => {
      render(<Menu items={menuItems} />);
      // Regular items are menuitem, parent items with children are button
      const menuItems$ = screen.getAllByRole('menuitem');
      expect(menuItems$.length).toBeGreaterThan(0);
    });

    it('disabled items have aria-disabled', () => {
      render(<Menu items={menuItems} />);
      const disabledItem = screen.getByText('Disabled').closest('a');
      expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    });

    it('disabled items have tabIndex=-1', () => {
      render(<Menu items={menuItems} />);
      const disabledItem = screen.getByText('Disabled').closest('a');
      expect(disabledItem).toHaveAttribute('tabindex', '-1');
    });

    it('parent menu item has aria-expanded', () => {
      render(<Menu items={menuItems} />);
      const parentItem = screen.getByText('Sub Menu').closest('a');
      expect(parentItem).toHaveAttribute('aria-expanded', 'false');
    });

    it('expanded submenu has role="menu" with aria-label', () => {
      render(<Menu items={menuItems} />);
      // Click the parent to expand
      const parentItem = screen.getByText('Sub Menu').closest('a')!;
      fireEvent.click(parentItem);
      const submenus = screen.getAllByRole('menu');
      // Should have at least the top-level menu + the submenu
      expect(submenus.length).toBeGreaterThanOrEqual(2);
      const submenu = submenus.find(el => el.getAttribute('aria-label') === 'Sub Menu submenu');
      expect(submenu).toBeInTheDocument();
    });

    it('icons are decorative (aria-hidden)', () => {
      const { container } = render(<Menu items={menuItems} />);
      const iconContainers = container.querySelectorAll('.menu-item-icon');
      iconContainers.forEach((iconContainer) => {
        expect(iconContainer).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  // ── Pagination ─────────────────────────────────────────────────────────
  describe('Pagination', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <Pagination
          currentPage={3}
          totalItems={100}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has role="navigation" with aria-label', () => {
      render(
        <Pagination
          currentPage={1}
          totalItems={50}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      const nav = screen.getByRole('navigation', { name: 'Pagination' });
      expect(nav).toBeInTheDocument();
    });

    it('current page button has aria-current="page"', () => {
      render(
        <Pagination
          currentPage={2}
          totalItems={50}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      const currentPageBtn = screen.getByLabelText('Page 2');
      expect(currentPageBtn).toHaveAttribute('aria-current', 'page');
    });

    it('previous and next buttons have accessible labels', () => {
      render(
        <Pagination
          currentPage={3}
          totalItems={50}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    });

    it('previous button is disabled on first page', () => {
      render(
        <Pagination
          currentPage={1}
          totalItems={50}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
    });

    it('next button is disabled on last page', () => {
      render(
        <Pagination
          currentPage={5}
          totalItems={50}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      expect(screen.getByLabelText('Go to next page')).toBeDisabled();
    });

    it('has a live region announcing current page', () => {
      const { container } = render(
        <Pagination
          currentPage={3}
          totalItems={100}
          pageSize={10}
          onPageChange={jest.fn()}
        />,
      );
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion!.textContent).toContain('Page 3 of 10');
    });

    it('supports keyboard navigation with arrow keys', () => {
      const onPageChange = jest.fn();
      render(
        <Pagination
          currentPage={3}
          totalItems={100}
          pageSize={10}
          onPageChange={onPageChange}
        />,
      );
      const nav = screen.getByRole('navigation');
      fireEvent.keyDown(nav, { key: 'ArrowLeft' });
      expect(onPageChange).toHaveBeenCalledWith(2);

      fireEvent.keyDown(nav, { key: 'ArrowRight' });
      expect(onPageChange).toHaveBeenCalledWith(4);
    });
  });
});
