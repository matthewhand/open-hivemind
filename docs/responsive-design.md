# Responsive Design Guide

This document outlines the responsive design patterns and breakpoints used in the open-hivemind application.

## Table of Contents

- [Breakpoints](#breakpoints)
- [Hooks](#hooks)
- [Responsive Patterns](#responsive-patterns)
- [Component Guidelines](#component-guidelines)
- [Testing Responsive Layouts](#testing-responsive-layouts)

## Breakpoints

The application uses standard Tailwind CSS breakpoints aligned with DaisyUI:

| Breakpoint | Min Width | Device Category | Use Case |
|------------|-----------|-----------------|----------|
| `mobile` (default) | 0px | Mobile phones (portrait) | Single column layouts, simplified UI |
| `sm` | 640px | Mobile phones (landscape), small tablets | 1-2 column layouts |
| `md` | 768px | Tablets | 2-3 column layouts, show more detail |
| `lg` | 1024px | Laptops, small desktops | Full desktop UI, sidebars visible |
| `xl` | 1280px | Large desktops | Expanded layouts, more columns |
| `2xl` | 1536px | Extra large displays | Maximum width layouts |

### Design Categories

For simplified responsive logic, we categorize devices into three main groups:

- **Mobile**: `< 768px` (below `md` breakpoint)
- **Tablet**: `768px - 1023px` (`md` to `lg` breakpoint)
- **Desktop**: `≥ 1024px` (`lg` breakpoint and above)

## Hooks

### useMediaQuery

Primary hook for responsive design. Returns convenient boolean flags for screen size detection.

```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MyComponent = () => {
  const { isMobile, isTablet, isDesktop } = useMediaQuery();

  return (
    <div>
      {isMobile && <MobileView />}
      {isTablet && <TabletView />}
      {isDesktop && <DesktopView />}
    </div>
  );
};
```

**API:**
- `isMobile: boolean` - True when width < 768px
- `isTablet: boolean` - True when 768px ≤ width < 1024px
- `isDesktop: boolean` - True when width ≥ 1024px
- `width: number` - Current window width in pixels

### useIsBelow

Check if screen is below a specific breakpoint.

```tsx
import { useIsBelow } from '@/hooks/useMediaQuery';

const MyComponent = () => {
  const isBelowMd = useIsBelow('md');

  return (
    <div className={isBelowMd ? 'flex-col' : 'flex-row'}>
      {/* Content */}
    </div>
  );
};
```

### useIsAbove

Check if screen is at or above a specific breakpoint.

```tsx
import { useIsAbove } from '@/hooks/useMediaQuery';

const MyComponent = () => {
  const isAboveLg = useIsAbove('lg');

  return (
    <div>
      {isAboveLg && <Sidebar />}
      <MainContent />
    </div>
  );
};
```

### useIsBetween

Check if screen width falls between two breakpoints.

```tsx
import { useIsBetween } from '@/hooks/useMediaQuery';

const MyComponent = () => {
  const isTabletRange = useIsBetween('md', 'lg');

  return (
    <div className={isTabletRange ? 'grid-cols-2' : 'grid-cols-1'}>
      {/* Content */}
    </div>
  );
};
```

### Legacy: useBreakpoint & useIsBelowBreakpoint

The application also has older breakpoint hooks for backward compatibility:

```tsx
import { useBreakpoint, useIsBelowBreakpoint } from '@/hooks/useBreakpoint';

const breakpoint = useBreakpoint(); // Returns: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
const isBelowMd = useIsBelowBreakpoint('md'); // Returns boolean
```

**Recommendation**: Use the newer `useMediaQuery` hooks for new components as they provide clearer semantics and better performance.

## Responsive Patterns

### 1. Navigation

**Mobile**: Hamburger menu with full-screen drawer
**Desktop**: Fixed sidebar navigation

```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';

const Navigation = () => {
  const { isMobile } = useMediaQuery();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 h-14">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MenuIcon />
          </button>
        </header>
        {isMenuOpen && <MobileDrawer />}
      </>
    );
  }

  return <FixedSidebar className="w-[240px]" />;
};
```

**Example**: See `src/client/src/components/DaisyUI/ResponsiveNavigation.tsx`

### 2. Card Grids

**Mobile**: Single column stacked layout
**Tablet**: 2 columns
**Desktop**: 3+ columns

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

**Example**: See `src/client/src/pages/BotsPage.tsx` (line 543)

### 3. Data Tables

**Mobile**: Card-based view with prominent fields
**Desktop**: Full table with all columns

The `DataTable` component automatically switches between card and table views:

```tsx
import DataTable from '@/components/DaisyUI/DataTable';

<DataTable
  data={data}
  columns={[
    { key: 'name', title: 'Name', prominent: true }, // Shows at top on mobile
    { key: 'status', title: 'Status' },
    { key: 'actions', title: '', hideOnCard: true }, // Hidden on mobile cards
  ]}
  actions={[
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
  ]}
/>
```

**Example**: See `src/client/src/components/DaisyUI/DataTable.tsx`

### 4. Sidebars & Panels

**Mobile**: Collapsible or hidden by default
**Desktop**: Always visible, fixed position

```tsx
const { isDesktop } = useMediaQuery();

<div className="flex">
  {isDesktop && (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px]">
      <Sidebar />
    </aside>
  )}
  <main className={isDesktop ? 'ml-[240px]' : 'ml-0'}>
    <Content />
  </main>
</div>
```

### 5. Form Layouts

**Mobile**: Single column, full-width inputs
**Desktop**: Multi-column, inline labels

```tsx
<div className="form-control">
  <label className="label flex-col sm:flex-row">
    <span className="label-text w-full sm:w-1/3">Email</span>
    <input className="input w-full sm:w-2/3" />
  </label>
</div>
```

### 6. Touch Targets

All interactive elements on mobile should meet minimum touch target size (44x44px):

```tsx
const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

<button className={`btn btn-sm ${TOUCH_TARGET}`}>
  <Icon />
</button>
```

**Example**: See `src/client/src/components/DaisyUI/DataTable.tsx` (line 72)

### 7. Drag & Drop

**Mobile**: Replace drag handles with up/down arrow buttons
**Desktop**: Show drag handles and enable drag & drop

```tsx
const { isMobile } = useMediaQuery();

{isMobile ? (
  <div className="flex flex-col">
    <button onClick={() => moveUp(index)}>
      <ChevronUp />
    </button>
    <button onClick={() => moveDown(index)}>
      <ChevronDown />
    </button>
  </div>
) : (
  <div
    draggable
    onDragStart={handleDragStart}
    className="cursor-grab active:cursor-grabbing"
  >
    <GripVertical />
  </div>
)}
```

**Example**: See `src/client/src/pages/PersonasPage.tsx` (lines 540-567)

## Component Guidelines

### When to Use Each Approach

1. **Tailwind Utility Classes** (Preferred for simple layouts)
   - Use for basic responsive layouts (grid columns, flex direction, spacing)
   - Keeps markup clean and declarative
   - Example: `className="flex flex-col md:flex-row gap-4"`

2. **useMediaQuery Hook** (For conditional rendering)
   - Use when components are fundamentally different on mobile vs desktop
   - Better performance than CSS-only solutions for component-level changes
   - Example: Different navigation components for mobile/desktop

3. **CSS Media Queries** (For style-only changes)
   - Use for minor visual tweaks (font sizes, padding adjustments)
   - Keep in component-level CSS modules if needed

### Responsive Checklist

When implementing a new component or page:

- [ ] Test on mobile (< 768px), tablet (768-1023px), and desktop (≥ 1024px)
- [ ] Ensure touch targets are at least 44x44px on mobile
- [ ] Hide or simplify non-essential UI elements on mobile
- [ ] Use card layouts instead of tables on mobile when appropriate
- [ ] Make sidebars collapsible/hidden on mobile
- [ ] Test drag & drop interactions (provide alternatives for touch devices)
- [ ] Verify horizontal scrolling is avoided on small screens
- [ ] Check that modals don't overflow viewport height on mobile

## Testing Responsive Layouts

### Browser DevTools

1. Open Chrome/Firefox DevTools (F12)
2. Click the device toolbar icon (Ctrl+Shift+M)
3. Select preset devices or enter custom dimensions
4. Test at key breakpoints: 375px, 768px, 1024px, 1440px

### Testing Script

```bash
# Run the dev server
npm run dev

# Open in browser and test at these widths:
# - 375px (iPhone SE)
# - 768px (iPad portrait)
# - 1024px (iPad landscape / small laptop)
# - 1440px (standard desktop)
```

### Automated Testing

Use the existing test utilities with viewport size mocking:

```tsx
import { render } from '@testing-library/react';

// Mock window.matchMedia for responsive tests
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query.includes('(min-width: 1024px)'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});
```

## Examples in Codebase

Key files demonstrating responsive patterns:

1. **Navigation**: `src/client/src/components/DaisyUI/ResponsiveNavigation.tsx`
   - Mobile hamburger menu vs desktop sidebar
   - Touch-friendly mobile header

2. **Tables**: `src/client/src/components/DaisyUI/DataTable.tsx`
   - Automatic card view on mobile
   - Prominent fields and hidden columns

3. **Bot Management**: `src/client/src/pages/BotsPage.tsx`
   - Responsive grid layout
   - Mobile-friendly drag controls
   - Collapsible preview panel

4. **Personas Page**: `src/client/src/pages/PersonasPage.tsx`
   - Card grid layout
   - Touch-friendly controls
   - Bulk selection UI

## Best Practices

1. **Mobile-First Approach**: Design for mobile first, then enhance for larger screens
2. **Performance**: Use `useMediaQuery` hooks instead of window resize listeners in components
3. **Accessibility**: Ensure keyboard navigation works across all breakpoints
4. **Consistency**: Use the standard breakpoints defined in `BREAKPOINTS` constant
5. **Testing**: Always test on real devices, not just browser DevTools
6. **Touch Targets**: Maintain 44x44px minimum touch target size
7. **Content Priority**: Show most important content first on mobile

## Future Improvements

- [ ] Add landscape orientation detection for tablets
- [ ] Implement responsive images with `srcset`
- [ ] Add responsive font scaling utility
- [ ] Create responsive spacing scale
- [ ] Add print stylesheet support
- [ ] Implement reduced motion preferences
- [ ] Add high contrast mode support

---

**Last Updated**: 2026-03-29
**Maintainer**: Development Team
