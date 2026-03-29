# Responsive Design Quick Reference

One-page cheat sheet for responsive design in open-hivemind.

## Import

```tsx
import { useMediaQuery, useIsBelow, useIsAbove, useIsBetween, BREAKPOINTS } from '@/hooks/useMediaQuery';
```

## Breakpoints

| Name | Width | Device |
|------|-------|--------|
| `mobile` | 0px | Phones |
| `sm` | 640px | Landscape phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large displays |

**Categories**: Mobile (`< 768px`) • Tablet (`768-1023px`) • Desktop (`≥ 1024px`)

## Hooks

### useMediaQuery

```tsx
const { isMobile, isTablet, isDesktop, width } = useMediaQuery();
```

Returns:
- `isMobile: boolean` - `< 768px`
- `isTablet: boolean` - `768-1023px`
- `isDesktop: boolean` - `≥ 1024px`
- `width: number` - Current width

### useIsBelow

```tsx
const isBelowMd = useIsBelow('md'); // < 768px
```

### useIsAbove

```tsx
const isAboveLg = useIsAbove('lg'); // ≥ 1024px
```

### useIsBetween

```tsx
const isTabletRange = useIsBetween('md', 'lg'); // 768-1023px
```

## Common Patterns

### Mobile/Desktop Toggle

```tsx
const { isMobile } = useMediaQuery();
return isMobile ? <MobileView /> : <DesktopView />;
```

### Three-Way Split

```tsx
const { isMobile, isTablet, isDesktop } = useMediaQuery();

if (isMobile) return <MobileLayout />;
if (isTablet) return <TabletLayout />;
return <DesktopLayout />;
```

### Tailwind Responsive Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card {...item} />)}
</div>
```

### Responsive Sidebar

```tsx
const { isDesktop } = useMediaQuery();

<div className="flex">
  {isDesktop && <Sidebar className="w-64" />}
  <main className={isDesktop ? 'ml-64' : ''}>{children}</main>
</div>
```

### Touch vs Drag

```tsx
const { isMobile } = useMediaQuery();

{isMobile ? (
  <div>
    <button className="min-h-[44px] min-w-[44px]">↑</button>
    <button className="min-h-[44px] min-w-[44px]">↓</button>
  </div>
) : (
  <div draggable className="cursor-grab">⋮⋮</div>
)}
```

### Responsive Modal

```tsx
const { isMobile } = useMediaQuery();

<div className={isMobile ? 'fixed inset-0' : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96'}>
  {/* Modal content */}
</div>
```

## Tailwind Classes

### Display

```tsx
className="hidden md:block"           // Hide on mobile
className="block md:hidden"           // Show on mobile only
className="hidden lg:flex"            // Hide until desktop
```

### Layout

```tsx
className="flex flex-col md:flex-row"    // Stack on mobile, row on tablet+
className="w-full md:w-1/2 lg:w-1/3"    // Responsive width
className="p-4 md:p-6 lg:p-8"            // Responsive padding
```

### Grid

```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### Text

```tsx
className="text-sm md:text-base lg:text-lg"  // Responsive font size
```

## Design Rules

1. **Touch Targets**: Minimum `44x44px` on mobile
2. **Mobile First**: Design for mobile, enhance for desktop
3. **Prefer Tailwind**: Use utility classes for simple responsive layouts
4. **Use Hooks**: For conditional rendering and component logic
5. **Test Devices**: Real device testing is crucial

## Touch Targets

```tsx
const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

<button className={`btn ${TOUCH_TARGET}`}>
  <Icon />
</button>
```

## Testing

### Manual Test Widths
- 375px (iPhone SE)
- 768px (iPad portrait)
- 1024px (iPad landscape)
- 1440px (Desktop)

### Mock in Tests

```tsx
jest.mock('@/hooks/useMediaQuery');

(useMediaQuery as jest.Mock).mockReturnValue({
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  width: 375,
});
```

## Migration from Legacy

### Before
```tsx
import { useIsBelowBreakpoint } from '@/hooks/useBreakpoint';
const isMobile = useIsBelowBreakpoint('md');
```

### After
```tsx
import { useMediaQuery } from '@/hooks/useMediaQuery';
const { isMobile } = useMediaQuery();
```

## Component Checklist

When building responsive components:

- [ ] Test at mobile, tablet, desktop breakpoints
- [ ] Touch targets are 44x44px minimum
- [ ] Hide/simplify non-essential UI on mobile
- [ ] No horizontal scroll on small screens
- [ ] Modals don't overflow viewport
- [ ] Forms stack on mobile
- [ ] Tables become cards on mobile

## Key Files to Reference

- `src/client/src/components/DaisyUI/ResponsiveNavigation.tsx` - Navigation pattern
- `src/client/src/components/DaisyUI/DataTable.tsx` - Table to card pattern
- `src/client/src/pages/BotsPage.tsx` - Drag & drop pattern
- `src/client/src/pages/PersonasPage.tsx` - Card grid pattern

## Documentation

- **Start Here**: [RESPONSIVE_SUMMARY.md](RESPONSIVE_SUMMARY.md)
- **Full Guide**: [responsive-design.md](responsive-design.md)
- **Migration**: [responsive-migration-guide.md](responsive-migration-guide.md)
- **Examples**: [examples/ResponsiveComponent.example.tsx](examples/ResponsiveComponent.example.tsx)
- **Checklist**: [responsive-implementation-checklist.md](responsive-implementation-checklist.md)

---

**Pro Tip**: Bookmark this page for quick reference during development!
