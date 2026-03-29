# Responsive Design Implementation Checklist

This document tracks responsive design improvements needed across the application.

## Status Legend

- ✅ Implemented and tested
- 🟡 Partially implemented (needs improvement)
- ⏳ Planned (not started)
- ❌ Not needed / not applicable

## Core Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| `useMediaQuery` hook | ✅ | Created at `src/client/src/hooks/useMediaQuery.ts` |
| `useBreakpoint` hook | ✅ | Existing, contains legacy `useMediaQuery` |
| Responsive design docs | ✅ | Documentation complete |
| Migration guide | ✅ | Guide created for developers |

## Layout Components

### Navigation & Layout

| Component | Status | Mobile | Tablet | Desktop | Notes |
|-----------|--------|--------|--------|---------|-------|
| `ResponsiveNavigation` | 🟡 | ✅ | ✅ | ✅ | Uses legacy hook, consider migration |
| `MainLayout` | 🟡 | ✅ | ✅ | ✅ | Uses ResponsiveNavigation |
| `UberLayout` | ⏳ | - | - | - | Needs review |

**ResponsiveNavigation Improvements Needed:**
- [ ] Migrate from legacy `useMediaQuery` in `useBreakpoint.ts` to new `useMediaQuery.ts`
- [ ] Ensure hamburger menu touch target is 44x44px (currently implemented)
- [ ] Test drawer animation performance on low-end devices
- [ ] Verify sidebar doesn't overlap content on exactly 1024px width

### Data Display Components

| Component | Status | Mobile | Tablet | Desktop | Notes |
|-----------|--------|--------|--------|---------|-------|
| `DataTable` | 🟡 | ✅ | ✅ | ✅ | Card view on mobile, table on desktop |
| `StatsCards` | 🟡 | ✅ | ✅ | ✅ | Responsive grid, could improve stacking |
| `EmptyState` | ✅ | ✅ | ✅ | ✅ | Scales well across breakpoints |
| `SearchFilterBar` | 🟡 | ✅ | ✅ | ✅ | Works but could stack better on mobile |
| `PageHeader` | 🟡 | ✅ | ✅ | ✅ | Action buttons could wrap better |

**DataTable Improvements Needed:**
- [ ] Migrate from `useIsBelowBreakpoint('md')` to `useMediaQuery()`
- [ ] Add horizontal scroll indicator for wide tables on mobile
- [ ] Improve card view spacing on very small screens (< 375px)
- [ ] Add option to hide less important columns on tablet view

**SearchFilterBar Improvements Needed:**
- [ ] Stack filters vertically on mobile instead of horizontal scroll
- [ ] Increase touch target size for filter dropdowns
- [ ] Add collapsible "Advanced Filters" section for tablet/desktop

## Page Components

### Bot Management

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `BotsPage` | 🟡 | ✅ | ✅ | ✅ | High |
| `BotCreatePage` | ⏳ | - | - | - | Medium |
| `BotConfigurationPage` | ⏳ | - | - | - | Medium |
| `BotTemplatesPage` | ⏳ | - | - | - | Low |

**BotsPage Improvements Needed:**
- [ ] Migrate from `useIsBelowBreakpoint('md')` to `useMediaQuery()`
- [ ] Hide preview panel on mobile (currently shows but could be drawer)
- [ ] Make bulk action bar sticky on mobile for better UX
- [ ] Reduce bot card padding on very small screens
- [ ] Test drag reordering on touch devices
- [ ] Consider lazy loading bot cards for performance

**Specific Changes for BotsPage:**

```tsx
// Current (line 279):
const isMobile = useIsBelowBreakpoint('md');

// Change to:
const { isMobile } = useMediaQuery();
```

**Preview Panel Improvements:**
```tsx
// Current: Preview panel hidden in 3-column grid
// Recommendation: Make it a slide-up drawer on mobile

{isMobile ? (
  <Drawer isOpen={!!previewBot} position="bottom">
    <BotPreviewContent bot={previewBot} />
  </Drawer>
) : (
  <aside className="lg:col-span-1">
    <BotPreviewContent bot={previewBot} />
  </aside>
)}
```

### Personas Management

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `PersonasPage` | 🟡 | ✅ | ✅ | ✅ | High |

**PersonasPage Improvements Needed:**
- [ ] Migrate from `useIsBelowBreakpoint('md')` to `useMediaQuery()`
- [ ] Improve modal scrolling on small screens
- [ ] Make bot assignment checkboxes larger for touch
- [ ] Test persona card drag reordering on tablets

**Specific Changes for PersonasPage:**

```tsx
// Current (line 159):
const isMobile = useIsBelowBreakpoint('md');

// Change to:
const { isMobile } = useMediaQuery();
```

### Providers & Configuration

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `ProvidersPage` | ⏳ | - | - | - | Medium |
| `LLMProvidersPage` | ⏳ | - | - | - | Medium |
| `MessageProvidersPage` | ⏳ | - | - | - | Medium |
| `MemoryProvidersPage` | ⏳ | - | - | - | Low |
| `ConfigPage` | ⏳ | - | - | - | Medium |

**Common Improvements Needed:**
- [ ] Convert configuration forms to single-column on mobile
- [ ] Make JSON editors more touch-friendly
- [ ] Add "Save" button to bottom of long forms on mobile
- [ ] Ensure all provider cards stack properly
- [ ] Test API key input fields on mobile keyboards

### Monitoring & Analytics

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `MonitoringPage` | ⏳ | - | - | - | High |
| `MonitoringDashboard` | ⏳ | - | - | - | High |
| `ActivityPage` | ⏳ | - | - | - | Medium |
| `AnalyticsDashboard` | ⏳ | - | - | - | Medium |
| `AdminHealthPage` | ⏳ | - | - | - | Low |

**MonitoringPage Improvements Needed:**
- [ ] Make charts responsive (consider mobile-friendly chart library)
- [ ] Stack metrics vertically on mobile
- [ ] Hide less critical metrics on mobile
- [ ] Make event stream scrollable with sticky header
- [ ] Add refresh button with pull-to-refresh on mobile

**Chart Recommendations:**
```tsx
// For responsive charts, consider:
const { isMobile } = useMediaQuery();

<Chart
  height={isMobile ? 200 : 400}
  options={{
    legend: { position: isMobile ? 'bottom' : 'right' },
    aspectRatio: isMobile ? 1.5 : 2.5,
  }}
/>
```

### User Interface

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `OverviewPage` | ⏳ | - | - | - | High |
| `DashboardPage` | ⏳ | - | - | - | High |
| `ChatPage` | ⏳ | - | - | - | High |
| `OnboardingPage` | ⏳ | - | - | - | Medium |

**ChatPage Priority Improvements:**
- [ ] Make chat input sticky at bottom on mobile
- [ ] Increase message bubble touch targets
- [ ] Hide sidebar by default on mobile
- [ ] Add swipe gestures for navigation
- [ ] Optimize message rendering for long conversations

### Settings & Admin

| Page | Status | Mobile | Tablet | Desktop | Priority |
|------|--------|--------|--------|---------|----------|
| `SystemSettings` | ⏳ | - | - | - | Medium |
| `SystemManagement` | ⏳ | - | - | - | Medium |
| `AuditPage` | ⏳ | - | - | - | Low |
| `ExportPage` | ⏳ | - | - | - | Low |

## Modal Components

| Component | Status | Mobile | Tablet | Desktop | Notes |
|-----------|--------|--------|--------|---------|-------|
| `Modal` | 🟡 | ✅ | ✅ | ✅ | Base component works well |
| `ConfirmModal` | ✅ | ✅ | ✅ | ✅ | Responsive and accessible |
| `CreateBotWizard` | ⏳ | - | - | - | Multi-step modal needs review |
| `BotSettingsModal` | ⏳ | - | - | - | Long form needs scroll handling |
| `ImportBotsModal` | ⏳ | - | - | - | File upload needs touch optimization |

**Modal Improvements Needed:**
- [ ] Ensure all modals don't exceed viewport height on mobile
- [ ] Add max-height with scroll for content area
- [ ] Make modal close buttons larger (44x44px) on mobile
- [ ] Test keyboard behavior on mobile browsers
- [ ] Consider bottom sheet pattern for mobile instead of center modal

## Form Components

| Component | Status | Mobile | Tablet | Desktop | Notes |
|-----------|--------|--------|--------|---------|-------|
| `Input` | ✅ | ✅ | ✅ | ✅ | Good touch target size |
| `Textarea` | ✅ | ✅ | ✅ | ✅ | Scales well |
| `Select` | 🟡 | ✅ | ✅ | ✅ | Could improve native select on mobile |
| `Checkbox` | 🟡 | 🟡 | ✅ | ✅ | Touch target could be larger |
| `Toggle` | 🟡 | 🟡 | ✅ | ✅ | Touch target could be larger |
| `ModelAutocomplete` | ⏳ | - | - | - | Dropdown needs mobile optimization |

**Form Component Improvements:**
- [ ] Increase checkbox/radio touch targets to 44x44px
- [ ] Add proper mobile keyboard types (number, email, tel, etc.)
- [ ] Improve autocomplete dropdown behavior on mobile
- [ ] Test form validation messages on small screens
- [ ] Add "Save" and "Cancel" buttons at bottom of forms on mobile

## Testing Matrix

### Device Testing Priorities

| Device Category | Width | Test Priority | Status |
|----------------|-------|---------------|--------|
| iPhone SE | 375px | High | ⏳ |
| iPhone 12/13/14 | 390px | High | ⏳ |
| iPhone 14 Pro Max | 430px | Medium | ⏳ |
| iPad Mini | 768px | High | ⏳ |
| iPad Pro | 1024px | Medium | ⏳ |
| MacBook Air | 1280px | High | ⏳ |
| Desktop | 1920px | Medium | ⏳ |

### Browser Testing

| Browser | Mobile | Tablet | Desktop | Priority |
|---------|--------|--------|---------|----------|
| Chrome | ⏳ | ⏳ | ⏳ | High |
| Safari | ⏳ | ⏳ | ⏳ | High |
| Firefox | ⏳ | ⏳ | ⏳ | Medium |
| Edge | ❌ | ❌ | ⏳ | Low |

## Priority Actions

### Week 1 (Immediate)
1. [ ] Test `useMediaQuery` hook on real devices
2. [ ] Migrate BotsPage to use new hook
3. [ ] Migrate PersonasPage to use new hook
4. [ ] Test DataTable card view on mobile devices
5. [ ] Fix any critical layout issues on mobile

### Week 2 (High Priority)
1. [ ] Migrate MonitoringPage/Dashboard for responsive charts
2. [ ] Improve modal behavior on mobile (max-height, scrolling)
3. [ ] Optimize ChatPage for mobile experience
4. [ ] Test and fix touch targets across all pages
5. [ ] Add responsive tests to CI/CD pipeline

### Week 3 (Medium Priority)
1. [ ] Migrate provider configuration pages
2. [ ] Improve form layouts for mobile
3. [ ] Add pull-to-refresh patterns where appropriate
4. [ ] Optimize images and assets for mobile
5. [ ] Test on various Android devices

### Week 4 (Polish)
1. [ ] Add responsive animations and transitions
2. [ ] Optimize bundle size for mobile
3. [ ] Add progressive web app (PWA) features
4. [ ] Performance testing and optimization
5. [ ] Final cross-browser/device testing

## Known Issues

### Critical
- None currently identified

### High Priority
- [ ] DataTable horizontal scroll on mobile can be confusing (needs indicator)
- [ ] Long bot names overflow cards on very small screens
- [ ] Modal forms can exceed viewport height on landscape mobile

### Medium Priority
- [ ] Bulk action bar overlaps content on small screens
- [ ] Drag handles are too small on tablets
- [ ] Chart legends overlap on mobile
- [ ] Some dropdowns open off-screen on mobile

### Low Priority
- [ ] Animation performance could be improved on older devices
- [ ] Some icons are too small on high-DPI mobile screens
- [ ] Footer could be optimized for mobile

## Resources

- [Responsive Design Guide](./responsive-design.md)
- [Migration Guide](./responsive-migration-guide.md)
- [Figma Design Files](link-to-figma) - If available
- [Mobile Testing Lab](link-to-browserstack) - If available

## Notes

- All touch targets should be minimum 44x44px per accessibility guidelines
- Test with real devices, not just browser DevTools
- Consider performance on lower-end devices
- Mobile users may have slower network connections
- Landscape orientation on tablets/phones needs testing too

---

**Last Updated**: 2026-03-29
**Maintained By**: Development Team
**Review Cycle**: Weekly during implementation phase
