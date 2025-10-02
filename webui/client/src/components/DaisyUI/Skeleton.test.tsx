import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonCircle, 
  SkeletonRectangle, 
  SkeletonCard, 
  SkeletonList 
} from './Skeleton';

describe('Skeleton', () => {
  describe('Basic Skeleton Component', () => {
    test('renders with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('skeleton');
      expect(skeleton).toHaveClass('rounded');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      expect(skeleton).toHaveAttribute('role', 'presentation');
    });

    test('applies custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('custom-class');
    });

    test('disables animation when animate is false', () => {
      const { container } = render(<Skeleton animate={false} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('skeleton-static');
    });
  });

  describe('Skeleton Shapes', () => {
    test('renders rectangle shape by default', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded');
    });

    test('renders circle shape', () => {
      const { container } = render(<Skeleton shape="circle" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-full');
    });

    test('renders text shape with single line', () => {
      const { container } = render(<Skeleton shape="text" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('space-y-2');
      expect(skeleton.children).toHaveLength(1);
    });

    test('renders text shape with multiple lines', () => {
      const { container } = render(<Skeleton shape="text" lines={3} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.children).toHaveLength(3);
    });

    test('applies different width to last line in multi-line text', () => {
      const { container } = render(<Skeleton shape="text" lines={3} />);
      const skeleton = container.firstChild as HTMLElement;
      const lastLine = skeleton.children[2] as HTMLElement;
      expect(lastLine.style.width).toBe('66.67%');
    });
  });

  describe('Size Properties', () => {
    test('applies custom width as string', () => {
      const { container } = render(<Skeleton width="200px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
    });

    test('applies custom width as number', () => {
      const { container } = render(<Skeleton width={150} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('150px');
    });

    test('applies custom height as string', () => {
      const { container } = render(<Skeleton height="50px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.height).toBe('50px');
    });

    test('applies custom height as number', () => {
      const { container } = render(<Skeleton height={40} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.height).toBe('40px');
    });

    test('applies both width and height', () => {
      const { container } = render(<Skeleton width="100px" height="60px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('100px');
      expect(skeleton.style.height).toBe('60px');
    });
  });

  describe('Accessibility', () => {
    test('has correct aria attributes', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      expect(skeleton).toHaveAttribute('role', 'presentation');
    });

    test('text skeleton lines have correct aria attributes', () => {
      const { container } = render(<Skeleton shape="text" lines={2} />);
      const skeleton = container.firstChild as HTMLElement;
      const lines = skeleton.children;
      
      for (let i = 0; i < lines.length; i++) {
        expect(lines[i]).toHaveAttribute('aria-hidden', 'true');
        expect(lines[i]).toHaveAttribute('role', 'presentation');
      }
    });
  });
});

describe('SkeletonText', () => {
  test('renders text skeleton with default props', () => {
    const { container } = render(<SkeletonText />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('space-y-2');
    expect(skeleton.children).toHaveLength(1);
  });

  test('renders multiple lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.children).toHaveLength(4);
  });

  test('applies custom props', () => {
    const { container } = render(<SkeletonText width="80%" animate={false} />);
    const skeleton = container.firstChild as HTMLElement;
    const line = skeleton.children[0] as HTMLElement;
    expect(line).toHaveClass('skeleton-static');
    expect(line.style.width).toBe('80%');
  });
});

describe('SkeletonCircle', () => {
  test('renders circle skeleton', () => {
    const { container } = render(<SkeletonCircle />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-full');
  });

  test('applies custom size', () => {
    const { container } = render(<SkeletonCircle width={50} height={50} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('50px');
    expect(skeleton.style.height).toBe('50px');
  });
});

describe('SkeletonRectangle', () => {
  test('renders rectangle skeleton', () => {
    const { container } = render(<SkeletonRectangle />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded');
    expect(skeleton).not.toHaveClass('rounded-full');
  });

  test('applies custom dimensions', () => {
    const { container } = render(<SkeletonRectangle width="100%" height="200px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('100%');
    expect(skeleton.style.height).toBe('200px');
  });
});

describe('SkeletonCard', () => {
  test('renders card structure with default props', () => {
    const { container } = render(<SkeletonCard />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('card');
    expect(card).toHaveClass('bg-base-100');
    expect(card).toHaveClass('shadow-xl');
  });

  test('renders with image skeleton when showImage is true', () => {
    const { container } = render(<SkeletonCard showImage={true} />);
    const card = container.firstChild as HTMLElement;
    const figure = card.querySelector('figure');
    expect(figure).toBeInTheDocument();
  });

  test('hides image skeleton when showImage is false', () => {
    const { container } = render(<SkeletonCard showImage={false} />);
    const card = container.firstChild as HTMLElement;
    const figure = card.querySelector('figure');
    expect(figure).not.toBeInTheDocument();
  });

  test('renders with actions when showActions is true', () => {
    const { container } = render(<SkeletonCard showActions={true} />);
    const card = container.firstChild as HTMLElement;
    const actions = card.querySelector('.card-actions');
    expect(actions).toBeInTheDocument();
  });

  test('hides actions when showActions is false', () => {
    const { container } = render(<SkeletonCard showActions={false} />);
    const card = container.firstChild as HTMLElement;
    const actions = card.querySelector('.card-actions');
    expect(actions).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<SkeletonCard className="custom-card" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-card');
  });
});

describe('SkeletonList', () => {
  test('renders list with default number of items', () => {
    const { container } = render(<SkeletonList />);
    const list = container.firstChild as HTMLElement;
    expect(list).toHaveClass('space-y-4');
    expect(list.children).toHaveLength(5); // default items
  });

  test('renders custom number of items', () => {
    const { container } = render(<SkeletonList items={3} />);
    const list = container.firstChild as HTMLElement;
    expect(list.children).toHaveLength(3);
  });

  test('renders with avatars when showAvatar is true', () => {
    const { container } = render(<SkeletonList items={2} showAvatar={true} />);
    const list = container.firstChild as HTMLElement;
    const firstItem = list.children[0] as HTMLElement;
    
    // Should have skeleton circle for avatar
    const skeletonElements = firstItem.querySelectorAll('.skeleton');
    const circleAvatar = Array.from(skeletonElements).find(el => 
      el.classList.contains('rounded-full')
    );
    expect(circleAvatar).toBeInTheDocument();
  });

  test('hides avatars when showAvatar is false', () => {
    const { container } = render(<SkeletonList items={2} showAvatar={false} />);
    const list = container.firstChild as HTMLElement;
    const firstItem = list.children[0] as HTMLElement;
    
    // Should not have circle avatars
    const circleAvatars = firstItem.querySelectorAll('.rounded-full');
    expect(circleAvatars).toHaveLength(0);
  });

  test('applies custom className', () => {
    const { container } = render(<SkeletonList className="custom-list" />);
    const list = container.firstChild as HTMLElement;
    expect(list).toHaveClass('custom-list');
  });

  test('disables animation when animate is false', () => {
    const { container } = render(<SkeletonList animate={false} />);
    const list = container.firstChild as HTMLElement;
    const firstItem = list.children[0] as HTMLElement;
    const skeletonElements = firstItem.querySelectorAll('.skeleton-static');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });
});