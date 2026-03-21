# SubLift — UI Specification

## Design Principles

1. **Engineering tool, not consumer app.** Dense information display is preferred over whitespace. Engineers want data visible, not hidden behind clicks.
2. **Data tables over cards** for lists with many fields (equipment, RAOs, crane curves).
3. **Real-time feedback** on the 2D canvas — every change immediately reflected.
4. **Consistent layout** — project workspace always has the same sidebar + content structure.
5. **Minimal clicks** — common actions accessible in 1-2 clicks from the current context.

## Color Palette

| Purpose | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary | Blue | #2563EB | Buttons, links, selected states |
| Success | Green | #16A34A | OK indicators, feasible cells |
| Warning | Yellow/Amber | #D97706 | Marginal indicators (70-90%) |
| Danger | Red | #DC2626 | Fail indicators, infeasible cells, barriers |
| Neutral | Gray | #6B7280 | Text, borders, inactive states |
| Water | Light Blue | #BFDBFE | Water area in 2D/3D |
| Deck | Warm Gray | #D6D3D1 | Deck surface |
| Barrier | Red transparent | #DC2626/50% | Barrier fill on 2D canvas |
| Load Zone | Blue transparent | #2563EB/20% | Deck load zone fill |
| Equipment | Green | #16A34A | Equipment fill on 2D canvas |
| Equipment selected | Blue border | #2563EB | Selected equipment highlight |

## Typography

- **Font:** System font stack (Inter if loaded, falls back to system)
- **Headings:** Semibold, 1.25-1.5rem
- **Body:** Regular, 0.875rem (14px) — slightly smaller than default for data density
- **Monospace:** For coordinates, numbers, calculation results — JetBrains Mono or system mono
- **Tables:** 0.8125rem (13px) for dense data tables (RAOs, crane curves, scatter diagrams)

## Global Layout

```
┌─ Top Bar ──────────────────────────────────────────────┐
│  SubLift Logo    [Vessels] [Equipment] [Projects]   👤  │
└────────────────────────────────────────────────────────┘
│                                                         │
│                   Page Content                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The top bar is persistent across all pages. Navigation highlights the active section.

## Screen Flow

```
                    ┌─────────────┐
                    │  Dashboard  │
                    │ (Project    │
                    │   List)     │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Vessel   │    │Equipment │    │ New Project   │
   │ Library  │    │ Library  │    │ (select vessel)│
   └────┬─────┘    └────┬─────┘    └──────┬────────┘
        ▼               ▼                 ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Vessel   │    │Equipment │    │   Project     │
   │ Editor   │    │ Editor   │    │  Workspace    │
   │(5 tabs)  │    │          │    └──────┬────────┘
   └──────────┘    └──────────┘           │
                                          │
                    ┌─────────────────────┬┼─────────────────────┐
                    ▼           ▼         ▼▼          ▼          ▼
              ┌─────────┐┌──────────┐┌────────┐┌──────────┐┌────────┐
              │Overview ││Deck 2D + ││  RAO   ││ Analysis ││Weather │
              │         ││  Crane   ││  Input ││DNV Splash││ Window │
              └─────────┘└──────────┘└────────┘└──────────┘└────────┘
                                          │          │
                                     ┌────▼────┐┌───▼─────┐
                                     │3D Viewer││PDF Report│
                                     └─────────┘└─────────┘
```

## Page Specifications

### Dashboard / Project List (`/#/projects`)

- Shows all projects as cards in a grid (2-3 per row)
- Each card: project name, vessel name, field, equipment count, status badge, last modified
- "New Project" button top right
- Empty state: illustration + "Create your first project" CTA

### Vessel Library (`/#/vessels`)

- Table view with columns: Name, Type, Deck Size, Crane Type, Max Capacity, Actions
- "New Vessel" button top right
- Click row or Edit button → Vessel Editor

### Vessel Editor (`/#/vessels/:id`)

- Split layout: left = 2D preview (40% width), right = tabbed form (60% width)
- Tabs: Deck, Barriers, Deck Load Zones, Crane, Crane Curve
- Save button in top right (sticky header)
- Back button in top left
- 2D preview updates in real time on any tab change

### Equipment Library (`/#/equipment`)

- Table view with columns: Name, Type, L, W, H, Weight, Actions
- Search bar + geometry type filter
- "New Equipment" button

### Equipment Editor (`/#/equipment/:id`)

- Split layout: left = 3D mini-preview (40%), right = form (60%)
- Form fields + calculated properties panel below
- Save button top right

### Project Workspace (`/#/projects/:id`)

- Sidebar left (200px fixed): navigation links + project summary
- Content area: renders the active sub-page
- Sidebar shows:
  - Project name (truncated)
  - Vessel name
  - Status badge
  - Nav links: Overview, Deck, RAO, Analysis, Weather, 3D, Report
  - Equipment summary: "3 items, 1 analyzed"

### Deck Layout + Crane (`/#/projects/:id/deck`)

- Three-panel layout:
  - Left: Project sidebar (200px)
  - Center: 2D Konva canvas (flex, takes remaining space)
  - Right: Equipment panel (280px) — available items + placed items
- Below canvas: toolbar (zoom, fit, grid, snap toggles)
- When equipment selected: bottom panel or right panel expands with crane interaction data + position toggle
- Canvas minimum height: 500px

### RAO Input (`/#/projects/:id/rao`)

- Full-width content area (no right panel)
- Wave direction dropdown at top
- Editable table below (TanStack Table)
- Paste button (opens paste dialog)
- RAO plots below table (tabbed: Heave, Roll, Pitch)
- Crane tip motion results panel at bottom

### DNV Analysis (`/#/projects/:id/analysis`)

- Equipment selector dropdown at top
- Input summary card
- Hydro coefficients card (read-only, auto-calculated)
- Results summary card (max Hs, DAF)
- Sea state operability grid (color-coded table)
- "Run Analysis" and "Run All Equipment" buttons

### Weather Window (`/#/projects/:id/weather`)

- Scatter diagram input (editable matrix table)
- Paste from Excel button
- Operability results table below
- Overlay view (scatter diagram + feasibility colors) below results

### 3D Viewer (`/#/projects/:id/3d`)

- Full-width Three.js canvas (fills content area)
- Floating control panel (bottom or top-right): view mode toggle, show/hide toggles, camera presets
- Capture screenshot button

### PDF Report (`/#/projects/:id/report`)

- Section checkboxes at top
- "Generate Report" button
- Preview area (scrollable pages)
- "Download PDF" button (appears after generation)
- Progress bar during generation

## Responsive Behavior

SubLift is designed for desktop use (engineering workstation). Minimum supported width: 1280px.

- Below 1280px: right panel (equipment list) collapses into a toggle drawer
- Below 1024px: show "Best viewed on desktop" message
- Mobile: not supported for MVP (show message)

## Component Library (shadcn/ui)

Standard components used across the app:

| Component | Usage |
|-----------|-------|
| Button | Primary actions, secondary actions, icon buttons |
| Input | Text, number inputs in forms |
| Select | Dropdowns (vessel type, crane type, geometry type) |
| Table | Equipment list, RAO table, crane curve table |
| Tabs | Vessel editor tabs, RAO plot tabs |
| Card | Project cards, summary cards, result cards |
| Dialog | Confirmation dialogs, paste dialogs |
| Toast | Success/error notifications |
| Badge | Status indicators (draft, analyzed, complete) |
| Tooltip | Hover info on sea state grid cells, crane capacity |
| Slider | Optional: boom angle adjustment |
| Toggle | Grid on/off, snap on/off, show/hide toggles |
| Progress | PDF generation progress, analysis progress |

## Loading States

- Page load: skeleton placeholders (shadcn Skeleton) for cards and tables
- Canvas load: spinner centered on canvas area
- Analysis running: progress bar with step labels
- PDF generating: progress bar with percentage
- Supabase fetch: inline spinner on affected section only, rest of page interactive
