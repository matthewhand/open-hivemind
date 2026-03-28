import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Breadcrumbs, { AutoBreadcrumbs } from '../Breadcrumbs';

describe('Breadcrumbs', () => {
  describe('manual mode (items prop)', () => {
    const defaultProps = {
      items: [
        { label: 'Level 1', href: '/level1' },
        { label: 'Current Page', href: '/level1/current', isActive: true },
      ],
    };

    it('renders breadcrumb items', () => {
      render(
        <MemoryRouter>
          <Breadcrumbs {...defaultProps} />
        </MemoryRouter>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('renders as a navigation landmark', () => {
      render(
        <MemoryRouter>
          <Breadcrumbs {...defaultProps} />
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('marks the current page with aria-current', () => {
      render(
        <MemoryRouter>
          <Breadcrumbs {...defaultProps} />
        </MemoryRouter>
      );

      const currentPage = screen.getByText('Current Page');
      const currentContainer = currentPage.closest('span');
      expect(currentContainer).toHaveAttribute('aria-current', 'page');
    });

    it('hides decorative icons from screen readers', () => {
      const { container } = render(
        <MemoryRouter>
          <Breadcrumbs {...defaultProps} />
        </MemoryRouter>
      );

      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('emits schema.org structured data', () => {
      const { container } = render(
        <MemoryRouter>
          <Breadcrumbs {...defaultProps} />
        </MemoryRouter>
      );

      const script = container.querySelector('script[type="application/ld+json"]');
      expect(script).toBeInTheDocument();
      const data = JSON.parse(script!.textContent!);
      expect(data['@type']).toBe('BreadcrumbList');
      expect(data.itemListElement).toHaveLength(3); // Home + 2 items
    });
  });

  describe('auto mode (no items prop)', () => {
    it('generates breadcrumbs from pathname', () => {
      render(
        <MemoryRouter initialEntries={['/admin/bots']}>
          <Breadcrumbs />
        </MemoryRouter>
      );

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Bots')).toBeInTheDocument();
    });

    it('returns null on root path', () => {
      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Breadcrumbs />
        </MemoryRouter>
      );

      expect(container.querySelector('nav')).toBeNull();
    });

    it('title-cases unknown segments', () => {
      render(
        <MemoryRouter initialEntries={['/admin/some-custom-page']}>
          <Breadcrumbs />
        </MemoryRouter>
      );

      expect(screen.getByText('Some Custom Page')).toBeInTheDocument();
    });

    it('marks last segment as active', () => {
      render(
        <MemoryRouter initialEntries={['/admin/bots']}>
          <Breadcrumbs />
        </MemoryRouter>
      );

      const bots = screen.getByText('Bots');
      const span = bots.closest('span');
      expect(span).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('backward compatibility', () => {
    it('exports AutoBreadcrumbs as an alias', () => {
      expect(AutoBreadcrumbs).toBe(Breadcrumbs);
    });
  });
});
