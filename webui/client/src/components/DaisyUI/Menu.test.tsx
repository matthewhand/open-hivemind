import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Menu, { MenuItem, MenuProps } from './Menu';

describe('Menu Component', () => {
  const mockItems: MenuItem[] = [
    {
      id: 'item1',
      label: 'Home',
      icon: '🏠',
      href: '/home',
    },
    {
      id: 'item2',
      label: 'Dashboard',
      icon: '📊',
      active: true,
      badge: 'NEW',
    },
    {
      id: 'item3',
      label: 'Settings',
      icon: '⚙️',
      disabled: true,
    },
    {
      id: 'item4',
      label: 'Admin',
      icon: '👑',
      children: [
        {
          id: 'item4-1',
          label: 'Users',
          icon: '👥',
          href: '/admin/users',
        },
        {
          id: 'item4-2',
          label: 'Roles',
          icon: '🔒',
          href: '/admin/roles',
          badge: '2',
        },
      ],
    },
  ];

  const renderMenu = (props: Partial<MenuProps> = {}) => {
    return render(<Menu items={mockItems} {...props} />);
  };

  describe('Basic Rendering', () => {
    test('renders all menu items', () => {
      renderMenu();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    test('renders icons correctly', () => {
      renderMenu();
      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('👑')).toBeInTheDocument();
    });

    test('renders badges correctly', () => {
      renderMenu();
      expect(screen.getByText('NEW')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('applies correct ARIA attributes', () => {
      renderMenu();
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu).toHaveAttribute('aria-label', 'Navigation menu');
    });
  });

  describe('Menu Variants', () => {
    test('renders vertical menu by default', () => {
      renderMenu();
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu', 'menu-vertical');
    });

    test('renders horizontal menu', () => {
      renderMenu({ variant: 'horizontal' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-horizontal');
    });

    test('renders sidebar menu', () => {
      renderMenu({ variant: 'sidebar' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-vertical');
    });

    test('renders dropdown menu', () => {
      renderMenu({ variant: 'dropdown' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-vertical');
    });
  });

  describe('Menu Sizes', () => {
    test('renders medium size by default', () => {
      renderMenu();
      const menu = screen.getByRole('menu');
      expect(menu).not.toHaveClass('menu-sm', 'menu-lg');
    });

    test('renders small size', () => {
      renderMenu({ size: 'sm' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-sm');
    });

    test('renders large size', () => {
      renderMenu({ size: 'lg' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-lg');
    });
  });

  describe('Menu States', () => {
    test('applies active class to active items', () => {
      renderMenu();
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveClass('menu-item-active');
    });

    test('applies disabled class to disabled items', () => {
      renderMenu();
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveClass('menu-item-disabled');
      expect(settingsLink).toHaveAttribute('aria-disabled', 'true');
      expect(settingsLink).toHaveAttribute('tabindex', '-1');
    });

    test('renders compact menu', () => {
      renderMenu({ compact: true });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-compact');
    });

    test('renders divided menu', () => {
      renderMenu({ divided: true });
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems[0]).toHaveClass('menu-item-divided');
    });
  });

  describe('Submenu Functionality', () => {
    test('renders submenu toggle indicator for items with children', () => {
      renderMenu();
      const adminLink = screen.getByText('Admin').closest('a');
      expect(adminLink).toHaveClass('menu-item-has-children');
      expect(adminLink).toHaveAttribute('aria-expanded', 'false');
    });

    test('toggles submenu on click', async () => {
      renderMenu();
      const adminLink = screen.getByText('Admin');

      // Initially collapsed
      expect(screen.queryByText('Users')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(adminLink);
      await waitFor(() => {
        expect(screen.getByText('Users')).toBeInTheDocument();
        expect(screen.getByText('Roles')).toBeInTheDocument();
      });

      // Check ARIA expanded state
      const adminElement = adminLink.closest('a');
      expect(adminElement).toHaveAttribute('aria-expanded', 'true');

      // Click to collapse
      fireEvent.click(adminLink);
      await waitFor(() => {
        expect(screen.queryByText('Users')).not.toBeInTheDocument();
      });
      expect(adminElement).toHaveAttribute('aria-expanded', 'false');
    });

    test('renders nested submenu items with correct structure', async () => {
      renderMenu();
      const adminLink = screen.getByText('Admin');
      fireEvent.click(adminLink);

      await waitFor(() => {
        const submenu = screen.getByLabelText('Admin submenu');
        expect(submenu).toBeInTheDocument();
        expect(submenu).toHaveAttribute('role', 'menu');
      });
    });

    test('allows multiple expanded submenus when allowMultipleExpanded is true', async () => {
      const itemsWithMultipleSubs: MenuItem[] = [
        {
          id: 'menu1',
          label: 'Menu 1',
          children: [{ id: 'item1', label: 'Item 1' }],
        },
        {
          id: 'menu2',
          label: 'Menu 2',
          children: [{ id: 'item2', label: 'Item 2' }],
        },
      ];

      render(<Menu items={itemsWithMultipleSubs} allowMultipleExpanded={true} />);

      const menu1Link = screen.getByText('Menu 1');
      const menu2Link = screen.getByText('Menu 2');

      fireEvent.click(menu1Link);
      fireEvent.click(menu2Link);

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });

    test('closes other submenus when allowMultipleExpanded is false', async () => {
      const itemsWithMultipleSubs: MenuItem[] = [
        {
          id: 'menu1',
          label: 'Menu 1',
          children: [{ id: 'item1', label: 'Item 1' }],
        },
        {
          id: 'menu2',
          label: 'Menu 2',
          children: [{ id: 'item2', label: 'Item 2' }],
        },
      ];

      render(<Menu items={itemsWithMultipleSubs} allowMultipleExpanded={false} />);

      const menu1Link = screen.getByText('Menu 1');
      const menu2Link = screen.getByText('Menu 2');

      fireEvent.click(menu1Link);
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      });

      fireEvent.click(menu2Link);
      await waitFor(() => {
        expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
    });
  });

  describe('Click Events', () => {
    test('calls onItemClick when item is clicked', () => {
      const mockOnItemClick = jest.fn();
      renderMenu({ onItemClick: mockOnItemClick });

      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);

      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0]);
    });

    test('calls item-specific onClick handler', () => {
      const mockItemClick = jest.fn();
      const itemsWithClick = [
        { ...mockItems[0], onClick: mockItemClick },
      ];

      render(<Menu items={itemsWithClick} />);

      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);

      expect(mockItemClick).toHaveBeenCalledWith(itemsWithClick[0]);
    });

    test('does not call handlers for disabled items', () => {
      const mockOnItemClick = jest.fn();
      renderMenu({ onItemClick: mockOnItemClick });

      const settingsLink = screen.getByText('Settings');
      fireEvent.click(settingsLink);

      expect(mockOnItemClick).not.toHaveBeenCalled();
    });

    test('navigates to href when clicked (items without children)', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      renderMenu();

      const homeLink = screen.getByText('Home');
      fireEvent.click(homeLink);

      expect(mockLocation.href).toBe('/home');
    });

    test('does not navigate for items with children', () => {
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      renderMenu();

      const adminLink = screen.getByText('Admin');
      fireEvent.click(adminLink);

      expect(mockLocation.href).toBe('');
    });
  });

  describe('Accessibility', () => {
    test('sets correct ARIA attributes for menu items', () => {
      renderMenu();

      // Regular menu item
      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveAttribute('role', 'menuitem');
      expect(homeLink).not.toHaveAttribute('aria-expanded');

      // Menu item with children
      const adminLink = screen.getByText('Admin').closest('a');
      expect(adminLink).toHaveAttribute('role', 'button');
      expect(adminLink).toHaveAttribute('aria-expanded', 'false');

      // Disabled item
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('aria-disabled', 'true');
      expect(settingsLink).toHaveAttribute('tabindex', '-1');
    });

    test('sets correct ARIA attributes for submenus', async () => {
      renderMenu();
      const adminLink = screen.getByText('Admin');
      fireEvent.click(adminLink);

      await waitFor(() => {
        const submenu = screen.getByLabelText('Admin submenu');
        expect(submenu).toHaveAttribute('role', 'menu');
      });
    });

    test('icons are marked as decorative', () => {
      renderMenu();
      const icons = screen.getAllByText(/🏠|📊|⚙️|👑/);
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Responsive Behavior', () => {
    test('applies responsive classes based on variant', () => {
      renderMenu({ variant: 'horizontal' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-horizontal');
    });

    test('handles different screen sizes appropriately', () => {
      // This would typically involve media query mocking
      // For now, we test that the component renders consistently
      renderMenu({ variant: 'vertical' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('menu-vertical');
    });
  });

  describe('Custom ClassName', () => {
    test('applies custom className to menu', () => {
      renderMenu({ className: 'custom-menu-class' });
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('custom-menu-class');
    });

    test('applies custom className to menu items', () => {
      const itemsWithClass = [
        { ...mockItems[0], className: 'custom-item-class' },
      ];

      render(<Menu items={itemsWithClass} />);

      const homeLink = screen.getByText('Home').closest('a');
      expect(homeLink).toHaveClass('custom-item-class');
    });
  });

  describe('Edge Cases', () => {
    test('renders empty menu gracefully', () => {
      render(<Menu items={[]} />);
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      expect(menu.children).toHaveLength(0);
    });

    test('handles items without icons', () => {
      const itemsWithoutIcons = [
        { id: 'item1', label: 'No Icon' },
      ];

      render(<Menu items={itemsWithoutIcons} />);
      expect(screen.getByText('No Icon')).toBeInTheDocument();
      expect(screen.queryByText(/🏠|📊|⚙️|👑/)).not.toBeInTheDocument();
    });

    test('handles items without badges', () => {
      const itemsWithoutBadges = [
        { id: 'item1', label: 'No Badge' },
      ];

      render(<Menu items={itemsWithoutBadges} />);
      expect(screen.getByText('No Badge')).toBeInTheDocument();
      expect(screen.queryByText('NEW')).not.toBeInTheDocument();
    });

    test('handles deeply nested submenus', async () => {
      const deeplyNestedItems: MenuItem[] = [
        {
          id: 'level1',
          label: 'Level 1',
          children: [
            {
              id: 'level2',
              label: 'Level 2',
              children: [
                {
                  id: 'level3',
                  label: 'Level 3',
                  children: [
                    { id: 'level4', label: 'Level 4' },
                  ],
                },
              ],
            },
          ],
        },
      ];

      render(<Menu items={deeplyNestedItems} />);

      const level1Link = screen.getByText('Level 1');
      fireEvent.click(level1Link);

      await waitFor(() => {
        const level2Link = screen.getByText('Level 2');
        fireEvent.click(level2Link);
      });

      await waitFor(() => {
        const level3Link = screen.getByText('Level 3');
        fireEvent.click(level3Link);
      });

      await waitFor(() => {
        expect(screen.getByText('Level 4')).toBeInTheDocument();
      });
    });
  });
});