import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../Breadcrumbs';

describe('Breadcrumbs', () => {
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

    // Check all SVGs are hidden
    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
