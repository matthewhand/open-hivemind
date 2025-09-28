import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from './Card';

describe('Card Component', () => {
  // Basic rendering tests
  describe('Basic Rendering', () => {
    test('renders card with title', () => {
      render(<Card title="Test Card" />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Card');
    });

    test('renders card with subtitle', () => {
      render(<Card title="Test Card" subtitle="Test Subtitle" />);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Subtitle');
    });

    test('renders card with body content', () => {
      render(<Card title="Test Card"><p>Card content</p></Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    test('renders card with actions', () => {
      render(<Card title="Test Card" actions={<button>Action</button>} />);
      expect(screen.getByRole('button')).toHaveTextContent('Action');
    });
  });

  // Style variant tests
  describe('Style Variants', () => {
    test('renders compact card', () => {
      const { container } = render(<Card title="Test Card" compact />);
      expect(container.firstChild).toHaveClass('card-compact');
    });

    test('renders side card', () => {
      const { container } = render(<Card title="Test Card" side />);
      expect(container.firstChild).toHaveClass('card-side');
    });

    test('renders image-full card', () => {
      const { container } = render(<Card title="Test Card" imageFull />);
      expect(container.firstChild).toHaveClass('image-full');
    });

    test('renders card with background variant', () => {
      const { container } = render(<Card title="Test Card" bgVariant="primary" />);
      expect(container.firstChild).toHaveClass('bg-primary');
    });

    test('renders card with border variant', () => {
      const { container } = render(<Card title="Test Card" borderVariant="primary" />);
      expect(container.firstChild).toHaveClass('border-primary');
    });

    test('renders card with custom className', () => {
      const { container } = render(<Card title="Test Card" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // Image tests
  describe('Image Support', () => {
    test('renders card with image', () => {
      render(<Card title="Test Card" imageSrc="test-image.jpg" imageAlt="Test Image" />);
      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'test-image.jpg');
    });

    test('renders image-full card with image', () => {
      render(<Card title="Test Card" imageSrc="test-image.jpg" imageFull />);
      const img = screen.getByAltText('Card image');
      expect(img).toBeInTheDocument();
    });

    test('renders image overlay card', () => {
      render(<Card title="Test Card" imageSrc="test-image.jpg" imageOverlay />);
      const img = screen.getByAltText('Card image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveClass('w-full h-full object-cover');
    });
  });

  // State tests
  describe('State Handling', () => {
    test('renders loading state with skeleton', () => {
      const { container } = render(<Card title="Test Card" loading />);
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test('renders empty state', () => {
      render(<Card title="Test Card" emptyState={<p>No data available</p>} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    test('renders empty state with image', () => {
      render(
        <Card
          title="Test Card"
          imageSrc="test-image.jpg"
          emptyState={<p>No data available</p>}
        />
      );
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByAltText('Card image')).toBeInTheDocument();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    test('has proper heading structure', () => {
      render(<Card title="Test Card" subtitle="Test Subtitle" />);
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });
      expect(h2).toHaveTextContent('Test Card');
      expect(h3).toHaveTextContent('Test Subtitle');
    });

    test('image has proper alt text', () => {
      render(<Card title="Test Card" imageSrc="test-image.jpg" imageAlt="Descriptive alt text" />);
      expect(screen.getByAltText('Descriptive alt text')).toBeInTheDocument();
    });

    test('image uses default alt text when not provided', () => {
      render(<Card title="Test Card" imageSrc="test-image.jpg" />);
      expect(screen.getByAltText('Card image')).toBeInTheDocument();
    });
  });

  // Responsive behavior tests
  describe('Responsive Behavior', () => {
    test('card has responsive classes by default', () => {
      const { container } = render(<Card title="Test Card" />);
      const cardElement = container.firstChild as HTMLElement;
      expect(cardElement).toHaveClass('card');
      // DaisyUI cards are responsive by default
    });

    test('side card maintains layout on different screen sizes', () => {
      const { container } = render(<Card title="Test Card" side />);
      expect(container.firstChild).toHaveClass('card-side');
    });
  });

  // Integration tests
  describe('Integration Scenarios', () => {
    test('renders agent status card', () => {
      render(
        <Card
          title="Agent #1"
          subtitle="Online"
          imageSrc="agent-avatar.jpg"
          bgVariant="success"
        >
          <p>Status: Active</p>
          <p>Platform: Discord</p>
        </Card>
      );

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Agent #1');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Online');
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
      expect(screen.getByText('Platform: Discord')).toBeInTheDocument();
      expect(screen.getByAltText('Card image')).toBeInTheDocument();
    });

    test('renders card with multiple actions', () => {
      render(
        <Card
          title="Agent #1"
          actions={
            <>
              <button>Edit</button>
              <button>Delete</button>
            </>
          }
        >
          <p>Agent details</p>
        </Card>
      );

      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByText('Agent details')).toBeInTheDocument();
    });

    test('renders loading agent card', () => {
      const { container } = render(
        <Card
          title="Agent #1"
          loading
          imageSrc="agent-avatar.jpg"
        />
      );

      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});