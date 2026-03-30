/**
 * @jest-environment jsdom
 */
import 'jest-axe/extend-expect';
import React from 'react';
import { render, screen } from '@testing-library/react';
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

// Mock useIsBelowBreakpoint to return false (desktop view) by default
jest.mock('../../src/client/src/hooks/useBreakpoint', () => ({
  useIsBelowBreakpoint: () => false,
  useMediaQuery: () => true,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import DataTable from '../../src/client/src/components/DaisyUI/DataTable';
import Card from '../../src/client/src/components/DaisyUI/Card';
import { Alert } from '../../src/client/src/components/DaisyUI/Alert';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface TestRow {
  id: number;
  name: string;
  status: string;
  role: string;
}

const sampleData: TestRow[] = [
  { id: 1, name: 'Alice', status: 'Active', role: 'Admin' },
  { id: 2, name: 'Bob', status: 'Inactive', role: 'User' },
  { id: 3, name: 'Charlie', status: 'Active', role: 'Editor' },
];

const columns = [
  { key: 'name' as const, title: 'Name', sortable: true, prominent: true },
  { key: 'status' as const, title: 'Status', sortable: true },
  { key: 'role' as const, title: 'Role', filterable: true },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Accessibility: Data Display Components', () => {
  // ── DataTable ──────────────────────────────────────────────────────────
  describe('DataTable', () => {
    it('has no axe violations with data', async () => {
      const { container } = render(
        <DataTable
          data={sampleData}
          columns={columns}
        />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('table has proper headers', () => {
      render(
        <DataTable data={sampleData} columns={columns} />,
      );
      const headers = document.querySelectorAll('th');
      expect(headers.length).toBeGreaterThanOrEqual(columns.length);
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('search input has accessible label', () => {
      render(
        <DataTable data={sampleData} columns={columns} searchable={true} />,
      );
      const searchInput = screen.getByLabelText('Search table data');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('role', 'searchbox');
    });

    it('page size selector has accessible label', () => {
      render(
        <DataTable data={sampleData} columns={columns} />,
      );
      const pageSizeSelect = screen.getByLabelText('Rows per page');
      expect(pageSizeSelect).toBeInTheDocument();
    });

    it('action buttons have aria-label', () => {
      render(
        <DataTable
          data={sampleData}
          columns={columns}
          actions={[
            { label: 'Edit', onClick: jest.fn(), variant: 'primary' },
            { label: 'Delete', onClick: jest.fn(), variant: 'error' },
          ]}
        />,
      );
      const editButtons = screen.getAllByLabelText('Edit');
      expect(editButtons.length).toBe(sampleData.length);
      const deleteButtons = screen.getAllByLabelText('Delete');
      expect(deleteButtons.length).toBe(sampleData.length);
    });

    it('has no axe violations when empty', async () => {
      const { container } = render(
        <DataTable data={[]} columns={columns} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations when loading', async () => {
      const { container } = render(
        <DataTable data={[]} columns={columns} loading={true} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('selectable table has checkbox in header', () => {
      render(
        <DataTable data={sampleData} columns={columns} selectable={true} />,
      );
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      // Header checkbox + one per row
      expect(checkboxes.length).toBe(sampleData.length + 1);
    });

    it('pagination controls have accessible labels', () => {
      // Generate enough data to trigger pagination
      const manyRows = Array.from({ length: 25 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        status: 'Active',
        role: 'User',
      }));
      render(
        <DataTable
          data={manyRows}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />,
      );
      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });
  });

  // ── Card ───────────────────────────────────────────────────────────────
  describe('Card', () => {
    it('has no axe violations with title and content', async () => {
      const { container } = render(
        <Card title="Bot Status" subtitle="Overview">
          <p>All systems operational</p>
        </Card>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with image and alt text', async () => {
      const { container } = render(
        <Card
          title="Provider Card"
          imageSrc="https://example.com/logo.png"
          imageAlt="Provider logo"
        >
          <p>Card content</p>
        </Card>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('image has alt text', () => {
      render(
        <Card
          imageSrc="https://example.com/img.png"
          imageAlt="Descriptive alt text"
        >
          <p>Content</p>
        </Card>,
      );
      const img = screen.getByAltText('Descriptive alt text');
      expect(img).toBeInTheDocument();
    });

    it('has no axe violations in loading state', async () => {
      const { container } = render(
        <Card title="Loading Card" loading={true} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations in empty state', async () => {
      const { container } = render(
        <Card emptyState={<p>No data available</p>} />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('compound Card.Title renders as heading', () => {
      render(
        <Card>
          <Card.Body>
            <Card.Title>My Card Title</Card.Title>
            <p>Card body</p>
          </Card.Body>
        </Card>,
      );
      const heading = screen.getByText('My Card Title');
      expect(heading.tagName).toBe('H2');
    });

    it('Card.Title supports custom heading level', () => {
      render(
        <Card>
          <Card.Body>
            <Card.Title tag="h3">Section Title</Card.Title>
          </Card.Body>
        </Card>,
      );
      const heading = screen.getByText('Section Title');
      expect(heading.tagName).toBe('H3');
    });
  });

  // ── Alert ──────────────────────────────────────────────────────────────
  describe('Alert', () => {
    it('has no axe violations for info status', async () => {
      const { container } = render(
        <Alert status="info" message="Informational message" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for error status', async () => {
      const { container } = render(
        <Alert status="error" message="Something went wrong" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for success status', async () => {
      const { container } = render(
        <Alert status="success" message="Operation completed" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for warning status', async () => {
      const { container } = render(
        <Alert status="warning" message="Proceed with caution" />,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('alert has role="alert"', () => {
      render(
        <Alert status="error" message="Error occurred" />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });
});
