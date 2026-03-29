# Responsive Design System Architecture

Visual diagram showing how the responsive design system works in open-hivemind.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Open Hivemind Application                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Responsive Design Layer                        │
│                                                                   │
│  ┌─────────────────────┐         ┌─────────────────────┐       │
│  │   useMediaQuery      │         │   Tailwind CSS       │       │
│  │   Hook System        │◄───────►│   Utility Classes    │       │
│  │                      │         │                      │       │
│  │ • useMediaQuery()    │         │ • md:flex-row        │       │
│  │ • useIsBelow()       │         │ • lg:grid-cols-3     │       │
│  │ • useIsAbove()       │         │ • hidden md:block    │       │
│  │ • useIsBetween()     │         │                      │       │
│  └─────────────────────┘         └─────────────────────┘       │
│            │                              │                       │
│            └──────────────┬───────────────┘                       │
│                           ▼                                       │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            Component Implementation                   │       │
│  │                                                       │       │
│  │  • Conditional Rendering (JS logic)                  │       │
│  │  • Responsive Styling (CSS classes)                  │       │
│  │  • Dynamic Behavior (event handlers)                 │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Browser APIs                             │
│                                                                   │
│  • window.matchMedia()  - Media query detection                 │
│  • window.innerWidth    - Viewport width                         │
│  • resize event         - Viewport changes                       │
└─────────────────────────────────────────────────────────────────┘
```

## Hook System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   useMediaQuery Hook System                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │useMediaQuery │  │  useIsBelow  │  │  useIsAbove  │
    │              │  │              │  │              │
    │ Returns:     │  │ Returns:     │  │ Returns:     │
    │ • isMobile   │  │ • boolean    │  │ • boolean    │
    │ • isTablet   │  │              │  │              │
    │ • isDesktop  │  │ Params:      │  │ Params:      │
    │ • width      │  │ • breakpoint │  │ • breakpoint │
    └──────────────┘  └──────────────┘  └──────────────┘
                                │
                                ▼
                       ┌──────────────┐
                       │ useIsBetween │
                       │              │
                       │ Returns:     │
                       │ • boolean    │
                       │              │
                       │ Params:      │
                       │ • min        │
                       │ • max        │
                       └──────────────┘
```

## Breakpoint System

```
Screen Width (px)
     0        640       768      1024     1280     1536
     │         │         │         │         │         │
     ├─────────┼─────────┼─────────┼─────────┼─────────┤
     │ mobile  │   sm    │   md    │   lg    │   xl    │  2xl
     └─────────┴─────────┴─────────┴─────────┴─────────┴───────►

Simplified Categories:
     ├───────────────────┼─────────────────┼───────────────────►
     │     isMobile      │    isTablet     │     isDesktop
     │     (< 768px)     │  (768-1023px)   │     (≥ 1024px)
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  User resizes browser window                                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Browser triggers 'resize' event                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  useMediaQuery debounces (150ms)                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Calculate new breakpoint state:                                 │
│  • Read window.innerWidth                                        │
│  • Compare against BREAKPOINTS                                   │
│  • Update: isMobile, isTablet, isDesktop, width                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  React re-renders components using the hook                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  UI updates based on new breakpoint                              │
│  • Show/hide components                                          │
│  • Change layouts                                                │
│  • Adjust styles                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Implementation Patterns

```
┌────────────────────────────────────────────────────────────────────┐
│                    Component Patterns                               │
└────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Conditional      │  │ Responsive       │  │ Hybrid           │
│ Rendering        │  │ Styling          │  │ Approach         │
│                  │  │                  │  │                  │
│ • Different      │  │ • Same component │  │ • JS for layout  │
│   components     │  │ • CSS classes    │  │ • CSS for style  │
│ • Based on       │  │ • Media queries  │  │                  │
│   screen size    │  │                  │  │ • Best of both   │
│                  │  │                  │  │                  │
│ Example:         │  │ Example:         │  │ Example:         │
│ if (isMobile)    │  │ className=       │  │ {isMobile ?      │
│   <MobileNav />  │  │  "grid           │  │   <MobileCard /> │
│ else             │  │   grid-cols-1    │  │  : null}         │
│   <DesktopNav /> │  │   md:grid-cols-2"│  │ <div className=  │
│                  │  │                  │  │  "text-sm md:    │
│                  │  │                  │  │   text-base" />  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Layout Transformation Example

```
Mobile (< 768px)                  Desktop (≥ 1024px)
┌──────────────────┐             ┌──────────────────────────────┐
│   Header         │             │ ┌────────┐  Header           │
│ ☰ Menu    [Logo] │             │ │Sidebar │                   │
├──────────────────┤             │ │        ├───────────────────┤
│                  │             │ │ • Nav  │                   │
│   Main Content   │             │ │ • Nav  │   Main Content    │
│                  │             │ │ • Nav  │                   │
│   ┌────────┐     │             │ │ • Nav  │   ┌────┬────┬───┐│
│   │ Card 1 │     │             │ │        │   │ C1 │ C2 │C3 ││
│   └────────┘     │             │ │        │   └────┴────┴───┘│
│   ┌────────┐     │             │ │        │   ┌────┬────┬───┐│
│   │ Card 2 │     │     vs      │ │        │   │ C4 │ C5 │C6 ││
│   └────────┘     │             │ │        │   └────┴────┴───┘│
│   ┌────────┐     │             │ │        │                   │
│   │ Card 3 │     │             │ └────────┘   Preview Panel   │
│   └────────┘     │             │              ┌──────────────┐│
│                  │             │              │              ││
│   Footer         │             │              │              ││
└──────────────────┘             │              └──────────────┘│
                                  │   Footer                     │
                                  └──────────────────────────────┘
```

## Hook Decision Tree

```
Should I use a hook or Tailwind classes?
                │
                ├─ Simple layout change (flex direction, grid columns)
                │  └─► Use Tailwind utility classes
                │      Example: className="flex flex-col md:flex-row"
                │
                ├─ Completely different components
                │  └─► Use useMediaQuery hook
                │      Example: {isMobile ? <MobileView /> : <DesktopView />}
                │
                ├─ Need breakpoint in JavaScript logic
                │  └─► Use useMediaQuery hook
                │      Example: const cols = isMobile ? 1 : isTablet ? 2 : 3;
                │
                ├─ Only style changes (colors, sizes)
                │  └─► Use Tailwind utility classes
                │      Example: className="text-sm md:text-base lg:text-lg"
                │
                └─ Complex responsive behavior
                   └─► Use combination (Hybrid approach)
                       Example: Hook for logic + Tailwind for styles
```

## Testing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Test Strategy                            │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Unit Tests       │  │ Manual Testing   │  │ E2E Tests        │
│                  │  │                  │  │                  │
│ • Hook behavior  │  │ • Real devices   │  │ • User flows     │
│ • Debouncing     │  │ • Key widths:    │  │ • Cross-browser  │
│ • Edge cases     │  │   - 375px        │  │ • Viewport sizes │
│ • SSR compat     │  │   - 768px        │  │                  │
│                  │  │   - 1024px       │  │ • Playwright     │
│ • Jest/Vitest    │  │   - 1440px       │  │ • Cypress        │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Performance Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Performance Optimizations                     │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Debouncing       │  │ Native APIs      │  │ Conditional      │
│                  │  │                  │  │ Loading          │
│ • 150ms delay    │  │ • matchMedia()   │  │                  │
│ • Prevents       │  │ • Browser-       │  │ • Lazy load      │
│   excessive      │  │   optimized      │  │   heavy features │
│   re-renders     │  │ • No polling     │  │   on desktop     │
│                  │  │ • Event-driven   │  │ • Code splitting │
│ • Configurable   │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## File Organization

```
src/client/src/
├── hooks/
│   ├── useMediaQuery.ts          ← Main hook file
│   ├── useBreakpoint.ts          ← Legacy (still in use)
│   └── __tests__/
│       └── useMediaQuery.test.ts ← Test suite
│
├── components/
│   ├── DaisyUI/
│   │   ├── ResponsiveNavigation.tsx  ← Navigation pattern
│   │   ├── DataTable.tsx             ← Table → Card pattern
│   │   └── ...
│   │
│   └── ... (other components)
│
└── pages/
    ├── BotsPage.tsx              ← Drag & drop pattern
    ├── PersonasPage.tsx          ← Card grid pattern
    └── ... (other pages)

docs/
├── RESPONSIVE_SUMMARY.md          ← Start here
├── responsive-quick-reference.md  ← Cheat sheet
├── responsive-design.md           ← Full guide
├── responsive-migration-guide.md  ← Migration help
├── responsive-implementation-checklist.md ← Tracking
├── responsive-architecture-diagram.md     ← This file
└── examples/
    └── ResponsiveComponent.example.tsx    ← Code examples
```

## Migration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Migration Process                             │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Phase 1          │  │ Phase 2          │  │ Phase 3          │
│ New Components   │  │ High Traffic     │  │ All Components   │
│                  │  │                  │  │                  │
│ • Use new hook   │  │ • BotsPage       │  │ • Complete       │
│   immediately    │  │ • PersonasPage   │  │   migration      │
│ • Follow guide   │  │ • DataTable      │  │ • Remove legacy  │
│ • Add tests      │  │ • Navigation     │  │   (if unused)    │
│                  │  │                  │  │                  │
│ Timeline: Now    │  │ Timeline: Wk 1-2 │  │ Timeline: Wk 3-4 │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Key Takeaways

1. **Two-Layer Approach**: Hooks (JS logic) + Tailwind (CSS styling)
2. **Performance First**: Debounced events, native APIs, minimal re-renders
3. **Three Categories**: Mobile, Tablet, Desktop (simplified reasoning)
4. **Touch-Friendly**: 44x44px minimum targets on mobile
5. **Test Thoroughly**: Unit tests + manual device testing + E2E

---

**Visual Guide Version**: 1.0.0
**Created**: 2026-03-29
**Last Updated**: 2026-03-29

> This diagram complements the written documentation. For code examples and detailed explanations, see the other responsive design docs.
