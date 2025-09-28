import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileDrawer from './MobileDrawer';
import { BrowserRouter } from 'react-router-dom';

// Mock the navigation links
const mockNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

describe('MobileDrawer', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <MobileDrawer navLinks={mockNavLinks} />
      </BrowserRouter>
    );
  });

  test('the drawer is initially hidden', () => {
    const drawerCheckbox = screen.getByRole('checkbox', { hidden: true });
    expect(drawerCheckbox).not.toBeChecked();
  });

  test('clicking the hamburger menu icon opens the drawer', () => {
    const drawerCheckbox = screen.getByRole('checkbox', { hidden: true });
    const hamburgerIcon = screen.getByLabelText('Open menu');

    expect(drawerCheckbox).not.toBeChecked();
    fireEvent.click(hamburgerIcon);
    expect(drawerCheckbox).toBeChecked();
  });

  test('clicking the overlay closes the drawer', () => {
    const drawerCheckbox = screen.getByRole('checkbox', { hidden: true });
    const hamburgerIcon = screen.getByLabelText('Open menu');

    // Open the drawer first
    fireEvent.click(hamburgerIcon);
    expect(drawerCheckbox).toBeChecked();

    // Click the overlay to close it
    const overlay = screen.getByLabelText('Close menu');
    fireEvent.click(overlay);
    expect(drawerCheckbox).not.toBeChecked();
  });

  test("pressing the 'Escape' key closes the drawer", () => {
    const drawerCheckbox = screen.getByRole('checkbox', { hidden: true });
    const hamburgerIcon = screen.getByLabelText('Open menu');

    // Open the drawer first
    fireEvent.click(hamburgerIcon);
    expect(drawerCheckbox).toBeChecked();

    // Press escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(drawerCheckbox).not.toBeChecked();
  });

  test('navigation links are rendered correctly', () => {
    mockNavLinks.forEach(link => {
      const navLink = screen.getByText(link.label);
      expect(navLink).toBeInTheDocument();
      expect(navLink.closest('a')).toHaveAttribute('href', link.href);
    });
  });

  test('all accessibility attributes are present and correct', () => {
    // Hamburger button
    const hamburgerIcon = screen.getByLabelText('Open menu');
    expect(hamburgerIcon).toHaveAttribute('role', 'button');
    expect(hamburgerIcon).toHaveAttribute('tabindex', '0');

    // Drawer side
    const drawerSide = screen.getByRole('navigation');
    expect(drawerSide).toBeInTheDocument();

    // Overlay
    const overlay = screen.getByLabelText('Close menu');
    expect(overlay).toBeInTheDocument();
  });
});