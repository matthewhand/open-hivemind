# Responsive Design Migration Guide

This guide helps developers migrate components from the legacy breakpoint hooks to the new `useMediaQuery` hook system.

## Overview

The application now has a standardized responsive design system with improved hooks for screen size detection. This migration guide will help you update existing components.

## Quick Migration Reference

### Before (Legacy)

```tsx
import { useIsBelowBreakpoint } from '@/hooks/useBreakpoint';

const MyComponent = () => {
  const isMobile = useIsBelowBreakpoint('md');
  // ...
};
```

### After (New)

```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MyComponent = () => {
  const { isMobile } = useMediaQuery();
  // ...
};
```

## Key Changes

### 1. Hook Import

**Before:**
```tsx
import { useBreakpoint, useIsBelowBreakpoint } from '@/hooks/useBreakpoint';
```

**After:**
```tsx
import { useMediaQuery, useIsBelow, useIsAbove } from '@/hooks/useMediaQuery';
```

### 2. Mobile Detection

**Before:**
```tsx
const isMobile = useIsBelowBreakpoint('md');
```

**After:**
```tsx
const { isMobile } = useMediaQuery();
```

### 3. Tablet Detection

**Before:**
```tsx
const breakpoint = useBreakpoint();
const isTablet = breakpoint === 'md';
```

**After:**
```tsx
const { isTablet } = useMediaQuery();
```

### 4. Desktop Detection

**Before:**
```tsx
const isMobile = useIsBelowBreakpoint('lg');
const isDesktop = !isMobile;
```

**After:**
```tsx
const { isDesktop } = useMediaQuery();
```

### 5. Specific Breakpoint Checks

**Before:**
```tsx
const isBelowMd = useIsBelowBreakpoint('md');
const isBelowLg = useIsBelowBreakpoint('lg');
```

**After:**
```tsx
const isBelowMd = useIsBelow('md');
const isBelowLg = useIsBelow('lg');
```

## Component-by-Component Examples

### Example 1: Simple Mobile/Desktop Toggle

**Before:**
```tsx
import { useIsBelowBreakpoint } from '@/hooks/useBreakpoint';

const Navigation = () => {
  const isMobile = useIsBelowBreakpoint('md');

  return (
    <div>
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </div>
  );
};
```

**After:**
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Navigation = () => {
  const { isMobile } = useMediaQuery();

  return (
    <div>
      {isMobile ? <MobileNav /> : <DesktopNav />}
    </div>
  );
};
```

### Example 2: Grid Layout

**Before:**
```tsx
import { useBreakpoint } from '@/hooks/useBreakpoint';

const CardGrid = ({ items }) => {
  const breakpoint = useBreakpoint();
  const cols = breakpoint === 'xs' || breakpoint === 'sm' ? 1
             : breakpoint === 'md' ? 2
             : 3;

  return (
    <div style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map(item => <Card key={item.id} {...item} />)}
    </div>
  );
};
```

**After:**
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const CardGrid = ({ items }) => {
  const { isMobile, isTablet, isDesktop } = useMediaQuery();
  const cols = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <div style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {items.map(item => <Card key={item.id} {...item} />)}
    </div>
  );
};
```

**Or better yet, use Tailwind classes:**
```tsx
const CardGrid = ({ items }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => <Card key={item.id} {...item} />)}
    </div>
  );
};
```

### Example 3: Sidebar with Multiple Breakpoints

**Before:**
```tsx
import { useBreakpoint } from '@/hooks/useBreakpoint';

const Layout = ({ children }) => {
  const breakpoint = useBreakpoint();
  const sidebarVisible = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
  const sidebarWidth = breakpoint === 'lg' ? 200 : 240;

  return (
    <div className="flex">
      {sidebarVisible && (
        <aside style={{ width: sidebarWidth }}>
          <Sidebar />
        </aside>
      )}
      <main>{children}</main>
    </div>
  );
};
```

**After:**
```tsx
import { useMediaQuery, useIsAbove } from '@/hooks/useMediaQuery';

const Layout = ({ children }) => {
  const { isDesktop } = useMediaQuery();
  const isXl = useIsAbove('xl');
  const sidebarWidth = isXl ? 240 : 200;

  return (
    <div className="flex">
      {isDesktop && (
        <aside style={{ width: sidebarWidth }}>
          <Sidebar />
        </aside>
      )}
      <main>{children}</main>
    </div>
  );
};
```

### Example 4: Touch-Friendly Controls

**Before:**
```tsx
import { useIsBelowBreakpoint } from '@/hooks/useBreakpoint';

const DragHandle = ({ onMoveUp, onMoveDown, ...dragProps }) => {
  const isMobile = useIsBelowBreakpoint('md');

  if (isMobile) {
    return (
      <div className="flex flex-col">
        <button onClick={onMoveUp}><ChevronUp /></button>
        <button onClick={onMoveDown}><ChevronDown /></button>
      </div>
    );
  }

  return (
    <div draggable {...dragProps}>
      <GripVertical />
    </div>
  );
};
```

**After:**
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const DragHandle = ({ onMoveUp, onMoveDown, ...dragProps }) => {
  const { isMobile } = useMediaQuery();

  if (isMobile) {
    return (
      <div className="flex flex-col">
        <button onClick={onMoveUp} className="min-h-[44px] min-w-[44px]">
          <ChevronUp />
        </button>
        <button onClick={onMoveDown} className="min-h-[44px] min-w-[44px]">
          <ChevronDown />
        </button>
      </div>
    );
  }

  return (
    <div draggable {...dragProps} className="cursor-grab">
      <GripVertical />
    </div>
  );
};
```

## Components Already Using New Pattern

These components are already using responsive patterns and can serve as reference:

1. **ResponsiveNavigation** (`src/client/src/components/DaisyUI/ResponsiveNavigation.tsx`)
   - Uses legacy `useMediaQuery` from `useBreakpoint.ts`
   - Shows mobile hamburger vs desktop sidebar pattern

2. **DataTable** (`src/client/src/components/DaisyUI/DataTable.tsx`)
   - Uses `useIsBelowBreakpoint('md')` for mobile detection
   - Switches between card and table views automatically

3. **BotsPage** (`src/client/src/pages/BotsPage.tsx`)
   - Uses `useIsBelowBreakpoint('md')` for drag controls
   - Responsive grid layout with Tailwind

4. **PersonasPage** (`src/client/src/pages/PersonasPage.tsx`)
   - Uses `useIsBelowBreakpoint('md')` for drag controls
   - Responsive card grid

## Migration Checklist

When migrating a component:

- [ ] Replace import statement
- [ ] Update hook call
- [ ] Test on mobile (< 768px)
- [ ] Test on tablet (768-1023px)
- [ ] Test on desktop (≥ 1024px)
- [ ] Verify touch targets are 44x44px minimum
- [ ] Check for layout shifts during resize
- [ ] Update any tests that mock window size
- [ ] Review Tailwind classes for consistency

## Common Pitfalls

### 1. Forgetting to destructure

**Wrong:**
```tsx
const useMediaQuery = useMediaQuery();
if (useMediaQuery.isMobile) { ... } // This won't work
```

**Right:**
```tsx
const { isMobile } = useMediaQuery();
if (isMobile) { ... }
```

### 2. Using old and new hooks together

**Avoid:**
```tsx
const { isMobile } = useMediaQuery();
const isBelowMd = useIsBelowBreakpoint('md'); // Redundant
```

**Better:**
```tsx
const { isMobile } = useMediaQuery(); // isMobile is equivalent to below 'md'
```

### 3. Not considering tablet as a separate category

**Before:**
```tsx
{isMobile ? <MobileView /> : <DesktopView />}
```

**Better:**
```tsx
const { isMobile, isTablet, isDesktop } = useMediaQuery();

{isMobile && <MobileView />}
{isTablet && <TabletView />}
{isDesktop && <DesktopView />}
```

### 4. Overusing JavaScript instead of Tailwind

**Over-engineered:**
```tsx
const { isMobile, isDesktop } = useMediaQuery();
const flexDirection = isMobile ? 'column' : 'row';
const gap = isMobile ? '1rem' : '2rem';

<div style={{ flexDirection, gap }}>
```

**Better:**
```tsx
<div className="flex flex-col md:flex-row gap-4 md:gap-8">
```

## Performance Considerations

### Before (Multiple Hook Calls)

```tsx
const isBelowSm = useIsBelowBreakpoint('sm');
const isBelowMd = useIsBelowBreakpoint('md');
const isBelowLg = useIsBelowBreakpoint('lg');
// Creates 3 separate event listeners
```

### After (Single Hook Call)

```tsx
const { isMobile, isTablet, isDesktop } = useMediaQuery();
// Creates 1 event listener, better performance
```

## Testing Updates

### Update Test Mocks

**Before:**
```tsx
jest.mock('@/hooks/useBreakpoint', () => ({
  useIsBelowBreakpoint: jest.fn(() => false),
}));
```

**After:**
```tsx
jest.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
  })),
}));
```

### Example Test

```tsx
import { render, screen } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MyComponent from './MyComponent';

jest.mock('@/hooks/useMediaQuery');

describe('MyComponent', () => {
  it('renders mobile view on small screens', () => {
    (useMediaQuery as jest.Mock).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      width: 375,
    });

    render(<MyComponent />);
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
  });

  it('renders desktop view on large screens', () => {
    (useMediaQuery as jest.Mock).mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1440,
    });

    render(<MyComponent />);
    expect(screen.getByTestId('desktop-nav')).toBeInTheDocument();
  });
});
```

## Gradual Migration Strategy

You don't need to migrate all components at once. Here's a recommended approach:

### Phase 1: New Components (Immediate)
- Use `useMediaQuery` for all new components
- Follow the patterns in the responsive design guide

### Phase 2: High-Traffic Pages (Week 1-2)
- Migrate key pages: Dashboard, BotsPage, PersonasPage
- Update shared components used across multiple pages

### Phase 3: Remaining Components (Week 3-4)
- Migrate remaining pages and components
- Update tests to use new mocks

### Phase 4: Deprecation (Week 5+)
- Remove unused legacy hooks if no longer referenced
- Update documentation to remove old patterns

## Support

If you encounter issues during migration:

1. Check the [Responsive Design Guide](./responsive-design.md) for patterns
2. Look at example components listed in this guide
3. Review existing tests for mock patterns
4. Consult with the team on edge cases

## Reference Links

- [Tailwind Responsive Design Docs](https://tailwindcss.com/docs/responsive-design)
- [DaisyUI Responsive Utilities](https://daisyui.com/docs/layout-and-typography/#responsive)
- [MDN: Window.matchMedia()](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)

---

**Last Updated**: 2026-03-29
**Maintainer**: Development Team
