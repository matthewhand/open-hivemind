# DaisyUI Style Guide & Component Documentation

## Overview

This document provides guidelines for using DaisyUI components consistently across the Open-Hivemind application. It covers component usage patterns, theming, and best practices for maintaining a cohesive user interface.

## Table of Contents

1. [Component Usage Guidelines](#component-usage-guidelines)
2. [Color Scheme & Theming](#color-scheme--theming)
3. [Layout Patterns](#layout-patterns)
4. [Component Documentation](#component-documentation)
5. [Best Practices](#best-practices)

## Component Usage Guidelines

### Buttons

#### Primary Actions
```tsx
<Button variant="primary" size="md">
  Primary Action
</Button>
```

#### Secondary Actions
```tsx
<Button variant="secondary" size="md">
  Secondary Action
</Button>
```

#### Ghost/Outline Actions
```tsx
<Button variant="ghost" size="md">
  Ghost Action
</Button>
```

#### Loading States
```tsx
<Button variant="primary" loading loadingText="Processing...">
  Save Changes
</Button>
```

### Cards

#### Basic Card Structure
```tsx
<Card>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content goes here</p>
    <div className="card-actions justify-end">
      <Button variant="primary">Action</Button>
    </div>
  </div>
</Card>
```

#### Card with Image
```tsx
<Card>
  <figure>
    <img src="image.jpg" alt="Card image" />
  </figure>
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
    <p>Card content</p>
  </div>
</Card>
```

### Form Components

#### Input Fields
```tsx
<TextInput
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  required
/>
```

#### Select Dropdowns
```tsx
<Select
  label="Choose Option"
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' }
  ]}
  value={selectedValue}
  onChange={handleChange}
/>
```

#### Toggles
```tsx
<Toggle
  id="feature-toggle"
  label="Enable Feature"
  checked={isEnabled}
  onChange={setIsEnabled}
  helperText="This will enable the advanced features"
/>
```

### Status & Feedback

#### Alerts
```tsx
<Alert status="success" message="Operation completed successfully!" />
<Alert status="error" message="An error occurred. Please try again." />
<Alert status="warning" message="Please review your input." />
<Alert status="info" message="Here's some helpful information." />
```

#### Badges
```tsx
<Badge variant="success">Active</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="neutral">Neutral</Badge>
```

#### Tooltips
```tsx
<Tooltip content="This is additional information" position="top">
  <Button variant="primary">Hover me</Button>
</Tooltip>
```

### Navigation & Menus

#### Dropdown Menus
```tsx
<Dropdown trigger="Menu" position="bottom">
  <li><a>Option 1</a></li>
  <li><a>Option 2</a></li>
  <li><a>Option 3</a></li>
</Dropdown>
```

#### Tabs
```tsx
<Tabs
  tabs={[
    {
      id: 'tab1',
      title: 'Tab 1',
      content: <div>Content for Tab 1</div>
    },
    {
      id: 'tab2',
      title: 'Tab 2',
      content: <div>Content for Tab 2</div>
    }
  ]}
  variant="bordered"
/>
```

## Color Scheme & Theming

### DaisyUI Theme Variables

The application uses DaisyUI's theming system with the following key variables:

- `primary`: Main brand color (#570df8)
- `secondary`: Secondary accent color (#f000b8)
- `accent`: Tertiary accent color (#37cdbe)
- `neutral`: Neutral gray tones
- `base-100`: Main background color
- `base-200`: Secondary background color
- `base-300`: Tertiary background color

### Theme Switching

Theme switching is handled through the `AdvancedThemeSwitcher` component and persists user preferences in localStorage.

## Layout Patterns

### Page Layout Structure

```tsx
<div className="min-h-screen bg-base-200">
  {/* Hero Section */}
  <Hero title="Page Title" subtitle="Page subtitle">
    {/* Hero content */}
  </Hero>

  {/* Main Content */}
  <div className="max-w-7xl mx-auto px-4 py-8">
    {/* Page content */}
  </div>
</div>
```

### Grid Layouts

#### Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>
```

#### Stats Layout
```tsx
<div className="stats stats-vertical lg:stats-horizontal shadow">
  <div className="stat">
    <div className="stat-title">Title</div>
    <div className="stat-value">Value</div>
    <div className="stat-desc">Description</div>
  </div>
</div>
```

## Component Documentation

### Core Components

#### Button
- **Variants**: `primary`, `secondary`, `accent`, `ghost`, `link`
- **Sizes**: `xs`, `sm`, `md`, `lg`
- **Styles**: `solid`, `outline`
- **States**: `loading`, `disabled`

#### Card
- **Variants**: Basic, compact, side, image-full
- **Sections**: `card-body`, `card-title`, `card-actions`
- **States**: `loading` (with skeleton)

#### Input Components
- **TextInput**: Single-line text input with label and validation
- **Textarea**: Multi-line text input with resizable option
- **Select**: Dropdown selection with customizable options
- **Toggle**: Boolean toggle with helper text

#### Feedback Components
- **Alert**: Status messages with different severity levels
- **Badge**: Small status indicators
- **ToastNotification**: Temporary notifications
- **Tooltip**: Contextual help text

### Advanced Components

#### Hero
- Full-width banner section with background image support
- Responsive typography and layout

#### Tabs
- Tabbed interface with multiple content sections
- Variants: `bordered`, `lifted`, `boxed`

#### Modal
- Overlay dialogs for forms and confirmations
- Accessible with proper focus management

#### Loading
- Skeleton loaders for content placeholders
- Spinner animations for loading states

## Best Practices

### 1. Component Composition

Always prefer composition over custom styling:

```tsx
// ✅ Good
<Card>
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <Button variant="primary">Action</Button>
  </div>
</Card>

// ❌ Avoid
<div className="bg-white rounded-lg shadow p-4">
  <h2 className="text-xl font-bold">Title</h2>
  <button className="bg-blue-500 text-white px-4 py-2 rounded">Action</button>
</div>
```

### 2. Responsive Design

Use DaisyUI's responsive utilities:

```tsx
// ✅ Good
<Button variant="primary" className="btn-sm md:btn-md lg:btn-lg">
  Responsive Button
</Button>

// ❌ Avoid
<Button variant="primary" style={{ fontSize: window.innerWidth > 768 ? '1rem' : '0.875rem' }}>
  Responsive Button
</Button>
```

### 3. Accessibility

- Always provide meaningful labels for form controls
- Use semantic HTML elements
- Ensure sufficient color contrast
- Support keyboard navigation

### 4. Performance

- Import only the components you need
- Use loading states appropriately
- Avoid unnecessary re-renders with proper memoization

### 5. Consistency

- Follow the established color scheme
- Use consistent spacing (DaisyUI's spacing scale)
- Maintain consistent component sizing
- Use the same naming conventions

## Migration from Material-UI

### Component Mapping

| Material-UI | DaisyUI | Notes |
|-------------|---------|-------|
| `Button` | `Button` | Similar API, enhanced variants |
| `Card` | `Card` | Different structure, more flexible |
| `TextField` | `TextInput` | Specialized for different input types |
| `Select` | `Select` | Simplified options format |
| `Switch` | `Toggle` | Enhanced with helper text |
| `Alert` | `Alert` | Status-based variants |
| `Chip` | `Badge` | Simplified variant system |
| `Snackbar` | `ToastNotification` | Different positioning |

### Key Differences

1. **Styling Approach**: DaisyUI uses utility-first CSS classes vs Material-UI's theme-based styling
2. **Component API**: More focused on composition and flexibility
3. **Theming**: CSS custom properties vs JavaScript theme objects
4. **Bundle Size**: Generally smaller due to utility-first approach

## Testing Guidelines

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './DaisyUI';

test('renders button with correct text', () => {
  render(<Button variant="primary">Click me</Button>);
  expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
});
```

### Visual Regression Testing

Use tools like Chromatic or Playwright to ensure visual consistency across theme changes.

## Maintenance

### Adding New Components

1. Create component in `src/client/src/components/DaisyUI/`
2. Export from `index.ts`
3. Add to this documentation
4. Create tests in `__tests__/DaisyUIComponents.test.tsx`
5. Update style guide if needed

### Theme Updates

When updating themes:
1. Test all components across different themes
2. Verify accessibility compliance
3. Update screenshots in documentation
4. Communicate changes to the team

## Resources

- [DaisyUI Documentation](https://daisyui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Component Library Source](./src/client/src/components/DaisyUI/)
- [Theme Configuration](./src/client/src/themes/)