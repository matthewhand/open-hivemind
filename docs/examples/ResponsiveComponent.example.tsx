/**
 * Example: Responsive Component Patterns
 *
 * This file demonstrates various patterns for building responsive components
 * using the useMediaQuery hook system.
 *
 * DO NOT IMPORT THIS FILE - it's for documentation purposes only.
 */

import React from 'react';
import { useMediaQuery, useIsBelow, useIsAbove } from '@/hooks/useMediaQuery';

/**
 * Example 1: Simple Mobile/Desktop Toggle
 *
 * Most common pattern - different UI for mobile vs desktop
 */
export const SimpleResponsiveNav = () => {
  const { isMobile } = useMediaQuery();

  return (
    <nav>
      {isMobile ? (
        <MobileNavigation />
      ) : (
        <DesktopNavigation />
      )}
    </nav>
  );
};

/**
 * Example 2: Three-Way Responsive Layout
 *
 * Different layouts for mobile, tablet, and desktop
 */
export const ResponsiveCardGrid = ({ items }: { items: any[] }) => {
  const { isMobile, isTablet, isDesktop } = useMediaQuery();

  return (
    <div className="container">
      {isMobile && (
        <div className="flex flex-col gap-4">
          {items.map(item => <MobileCard key={item.id} {...item} />)}
        </div>
      )}

      {isTablet && (
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => <TabletCard key={item.id} {...item} />)}
        </div>
      )}

      {isDesktop && (
        <div className="grid grid-cols-4 gap-6">
          {items.map(item => <DesktopCard key={item.id} {...item} />)}
        </div>
      )}
    </div>
  );
};

/**
 * Example 3: Progressive Enhancement
 *
 * Start with mobile and progressively add features for larger screens
 */
export const ProgressiveDataTable = ({ data }: { data: any[] }) => {
  const { isMobile, isDesktop } = useMediaQuery();

  return (
    <div>
      {/* Always show: Basic list */}
      <div className="space-y-2">
        {data.map(row => (
          <div key={row.id} className="card p-4">
            <h3>{row.name}</h3>
            <p>{row.description}</p>

            {/* Show on tablet+: More details */}
            {!isMobile && (
              <div className="mt-2 text-sm">
                <span>Status: {row.status}</span>
                <span className="ml-4">Created: {row.createdAt}</span>
              </div>
            )}

            {/* Show on desktop only: Advanced actions */}
            {isDesktop && (
              <div className="flex gap-2 mt-4">
                <button>Edit</button>
                <button>Clone</button>
                <button>Export</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example 4: Sidebar with Breakpoint Control
 *
 * Sidebar behavior changes based on screen size
 */
export const LayoutWithSidebar = ({ children }: { children: React.ReactNode }) => {
  const { isMobile } = useMediaQuery();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: Always visible sidebar */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-base-200">
          <Sidebar />
        </aside>
      )}

      {/* Mobile: Drawer overlay */}
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsSidebarOpen(false)}>
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-base-200">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 ${!isMobile ? 'ml-64' : ''}`}>
        {isMobile && (
          <button onClick={() => setIsSidebarOpen(true)}>
            Open Menu
          </button>
        )}
        {children}
      </main>
    </div>
  );
};

/**
 * Example 5: Touch-Friendly Controls
 *
 * Adapt UI controls for touch vs mouse interaction
 */
export const ResponsiveDragHandle = ({
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  index,
}: {
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  index: number;
}) => {
  const { isMobile } = useMediaQuery();

  if (isMobile) {
    // Touch devices: Show arrow buttons
    return (
      <div className="flex flex-col">
        <button
          className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px]"
          onClick={() => onMoveUp(index)}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          className="btn btn-ghost btn-sm min-h-[44px] min-w-[44px]"
          onClick={() => onMoveDown(index)}
          aria-label="Move down"
        >
          ↓
        </button>
      </div>
    );
  }

  // Desktop: Show drag handle
  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      className="cursor-grab active:cursor-grabbing p-2"
      aria-label="Drag to reorder"
    >
      ⋮⋮
    </div>
  );
};

/**
 * Example 6: Conditional Feature Loading
 *
 * Load heavy features only on desktop
 */
export const ConditionalFeatureLoader = () => {
  const { isDesktop } = useMediaQuery();
  const [HeavyChart, setHeavyChart] = React.useState<any>(null);

  React.useEffect(() => {
    if (isDesktop) {
      // Lazy load heavy charting library only on desktop
      import('@/components/Charts/AdvancedChart').then(module => {
        setHeavyChart(() => module.default);
      });
    }
  }, [isDesktop]);

  return (
    <div>
      {isDesktop && HeavyChart ? (
        <HeavyChart data={mockData} />
      ) : (
        <SimpleChart data={mockData} />
      )}
    </div>
  );
};

/**
 * Example 7: Responsive Modal
 *
 * Full screen on mobile, centered on desktop
 */
export const ResponsiveModal = ({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const { isMobile } = useMediaQuery();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className={`bg-white ${
          isMobile
            ? 'fixed inset-0 overflow-y-auto' // Full screen on mobile
            : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-lg'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Example 8: Responsive Form Layout
 *
 * Stacked on mobile, inline labels on desktop
 */
export const ResponsiveForm = () => {
  const { isMobile } = useMediaQuery();

  return (
    <form className="space-y-4">
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center'} gap-4`}>
        <label className={`font-medium ${isMobile ? 'w-full' : 'w-1/3'}`}>
          Email
        </label>
        <input
          type="email"
          className={`input input-bordered ${isMobile ? 'w-full' : 'flex-1'}`}
          placeholder="you@example.com"
        />
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row items-center'} gap-4`}>
        <label className={`font-medium ${isMobile ? 'w-full' : 'w-1/3'}`}>
          Password
        </label>
        <input
          type="password"
          className={`input input-bordered ${isMobile ? 'w-full' : 'flex-1'}`}
          placeholder="••••••••"
        />
      </div>

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row justify-end'} gap-2`}>
        <button type="button" className="btn btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </div>
    </form>
  );
};

/**
 * Example 9: Width-Based Conditional Rendering
 *
 * Use specific breakpoint checks for fine-grained control
 */
export const BreakpointSpecificComponent = () => {
  const isBelowMd = useIsBelow('md');
  const isAboveLg = useIsAbove('lg');

  return (
    <div>
      {/* Show compact view below 768px */}
      {isBelowMd && <CompactView />}

      {/* Show expanded view above 1024px */}
      {isAboveLg && <ExpandedView />}

      {/* Show default view for tablets (between md and lg) */}
      {!isBelowMd && !isAboveLg && <DefaultView />}
    </div>
  );
};

/**
 * Example 10: Responsive Grid with Tailwind
 *
 * Prefer Tailwind classes for simple responsive layouts
 */
export const TailwindResponsiveGrid = ({ items }: { items: any[] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.id} className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">{item.title}</h2>
            <p>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Placeholder components for examples
const MobileNavigation = () => <div>Mobile Nav</div>;
const DesktopNavigation = () => <div>Desktop Nav</div>;
const MobileCard = (props: any) => <div>Mobile Card</div>;
const TabletCard = (props: any) => <div>Tablet Card</div>;
const DesktopCard = (props: any) => <div>Desktop Card</div>;
const Sidebar = () => <div>Sidebar</div>;
const SimpleChart = (props: any) => <div>Simple Chart</div>;
const CompactView = () => <div>Compact View</div>;
const ExpandedView = () => <div>Expanded View</div>;
const DefaultView = () => <div>Default View</div>;
const mockData = [];
