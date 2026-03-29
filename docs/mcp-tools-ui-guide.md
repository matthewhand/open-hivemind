# MCP Tools Page - UI Guide

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ MCP Tools                                    [Execution History] │
│ Browse and manage tools available from your MCP servers          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ⏰ Recently Used (5)                                             │
│ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐            │
│ │ 🔧     │ │ 🔧     │ │ 🔧     │ │ 🔧     │ │ 🔧     │            │
│ │ Tool1 │ │ Tool2 │ │ Tool3 │ │ Tool4 │ │ Tool5 │            │
│ │ Desc  │ │ Desc  │ │ Desc  │ │ Desc  │ │ Desc  │            │
│ │ [Run] │ │ [Run] │ │ [Run] │ │ [Run] │ │ [Run] │            │
│ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘            │
│                                                                   │
│ ⭐ Favorites (3)                                                 │
│ ┌───────┐ ┌───────┐ ┌───────┐                                  │
│ │ 🔧     │ │ 🔧     │ │ 🔧     │                                  │
│ │ FavA  │ │ FavB  │ │ FavC  │                                  │
│ │ [Run] │ │ [Run] │ │ [Run] │                                  │
│ └───────┘ └───────┘ └───────┘                                  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ [All Tools] [Favorites (3)] [Recently Used (5)]                 │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 Search...] [Categories▾] [Servers▾] [Sort: Name▾]          │
├─────────────────────────────────────────────────────────────────┤
│ Showing 12 of 15 tools                                           │
│                                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ 🔧 Tool Name │ │ 🔧 Tool Name │ │ 🔧 Tool Name │            │
│ │         ⭐ ●  │ │         ☆ ●  │ │         ⭐ ●  │            │
│ │              │ │              │ │              │            │
│ │ Description  │ │ Description  │ │ Description  │            │
│ │              │ │              │ │              │            │
│ │ [Category]   │ │ [Category]   │ │ [Category]   │            │
│ │ [Server]     │ │ [Server]     │ │ [Server]     │            │
│ │              │ │              │ │              │            │
│ │ Usage: 5x    │ │ Usage: 2x    │ │ Usage: 10x   │            │
│ │ Last: Today  │ │              │ │ Last: Today  │            │
│ │              │ │              │ │              │            │
│ │[Disable] [Run│ │[Enable] [Run]│ │[Disable] [Run│            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Icon Legend

- 🔧 `ToolIcon` - Wrench/screwdriver icon for tools
- ⏰ `ClockIcon` - Clock icon for recently used
- ⭐ `StarSolidIcon` - Filled star for favorited items
- ☆ `StarOutlineIcon` - Outline star for non-favorited items
- 🔍 `SearchIcon` - Magnifying glass for search
- ▶️ `RunIcon` - Play button for execution
- ● - Status badge (green for enabled, gray for disabled)

## Interactive Elements

### Star Button Behavior
- **Click**: Toggles favorite status
- **Visual**: Solid yellow star ⭐ when favorited, outline star ☆ when not
- **Location**: Top-right of every tool card
- **Instant Update**: UI updates immediately, persisted to localStorage

### Quick Access Sections
- **Recently Used**: Shows last 5 executed tools
- **Favorites**: Shows all favorited tools
- **Compact Cards**: Smaller, horizontally scrollable
- **Quick Run**: One-click execution button

### Filter Tabs
- **All Tools**: Default view, shows all available tools
- **Favorites**: Filters to only show favorited tools
- **Recently Used**: Filters to only show recently used tools
- **Active Tab**: Highlighted with different background

### Sort Dropdown
- **Name (A-Z)**: Alphabetical sort (default)
- **Usage Count**: High to low usage
- **Recently Used**: Most recent first

## Responsive Behavior

### Desktop (lg: ≥1024px)
- Recently Used: 5 columns
- Favorites: 5 columns
- Main Grid: 3 columns

### Tablet (md: 768-1023px)
- Recently Used: 2 columns
- Favorites: 2 columns
- Main Grid: 2 columns

### Mobile (< 768px)
- Recently Used: 1 column (vertical scroll)
- Favorites: 1 column (vertical scroll)
- Main Grid: 1 column

## Color Scheme

### Status Badges
- **Enabled**: `badge-success` (green)
- **Disabled**: `badge-ghost` (gray)

### Category Badges
- **git**: `badge-primary` (blue)
- **database**: `badge-secondary` (purple)
- **filesystem**: `badge-info` (cyan)
- **network**: `badge-success` (green)
- **ai**: `badge-warning` (yellow)
- **utility**: `badge-ghost` (gray)

### Interactive Elements
- **Favorite Star**: `text-warning` (yellow)
- **Primary Buttons**: `btn-primary` (blue)
- **Success**: `badge-success` / `text-success` (green)
- **Error**: `badge-error` / `text-error` (red)

## User Flows

### Flow 1: Favoriting a Tool
1. User clicks star icon ☆ on a tool card
2. Icon changes to ⭐ (solid yellow)
3. Tool is added to favorites list
4. Tool appears in "Favorites" section
5. Change is saved to localStorage

### Flow 2: Quick Execute from Recent
1. User sees tool in "Recently Used" section
2. User clicks "Run" button on compact card
3. Modal opens with pre-filled arguments (if available)
4. User clicks "Run Tool" to execute
5. Tool moves to top of recently used list

### Flow 3: Filtering by Favorites
1. User clicks "Favorites" tab
2. Main grid shows only favorited tools
3. Search and other filters still apply
4. Tab selection persisted in URL

### Flow 4: Sorting by Usage
1. User opens "Sort" dropdown
2. User selects "Sort: Usage Count"
3. Main grid re-orders (most used first)
4. Sort preference persisted in URL

## Empty States

### No Recently Used
- Section is hidden
- No visual placeholder

### No Favorites
- Section is hidden
- No visual placeholder

### No Search Results
```
        No tools found
Try adjusting your search criteria or add more MCP servers
```

## Accessibility

- **Buttons**: All interactive elements are proper `<button>` elements
- **Titles**: Hover titles on icon-only buttons
- **Labels**: Form inputs have associated labels
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Readers**: Semantic HTML structure

## Performance

- **Debounced Search**: 300ms delay prevents excessive filtering
- **Memoized Computations**: Recently used and favorites computed once
- **Limited History**: Only last 10 executions stored in localStorage
- **Efficient Rendering**: Keys on all mapped elements prevent unnecessary re-renders

## Browser Storage

All persistence uses localStorage with JSON serialization:
- Survives page reloads
- Survives browser restarts
- Scoped to domain
- Approximately 5MB limit (usage is minimal)
