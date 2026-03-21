# Module 03 — Project Manager

## Objective

Create, open, and manage installation operation projects. Each project references a vessel from the global library and serves as the container for all operation-specific data.

## User Stories

1. As an engineer, I want to create a new project by selecting a vessel and providing basic info (name, field, water depth).
2. As an engineer, I want to see a list of all projects with their status.
3. As an engineer, I want to open a project and access all its sub-modules (deck layout, analysis, etc.).
4. As an engineer, I want to delete a project and all its associated data.
5. As an engineer, I want to see the project status (draft, analyzed, complete) at a glance.

## Routes

```
/#/                     → Dashboard (redirects to project list)
/#/projects             → Project list
/#/projects/new         → New project form
/#/projects/:id         → Project workspace shell (with sidebar navigation)
```

## UI Layout — Project List

```
┌──────────────────────────────────────────────────────────────┐
│  Projects                                           [+ New]   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Búzios PLET Campaign                         ● Draft    │ │
│  │ Vessel: Seven Seas (PLSV) | Field: Búzios | 2100m      │ │
│  │ Equipment: 4 items | Last modified: 2 hours ago         │ │
│  │ [Open]                                       [Delete]   │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Mero Manifold Install                      ● Analyzed   │ │
│  │ Vessel: Skandi Búzios (PLSV) | Field: Mero | 1800m     │ │
│  │ Equipment: 2 items | Last modified: 1 day ago           │ │
│  │ [Open]                                       [Delete]   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Status indicators:
- **● Draft** (gray) — Project created, no analysis run yet
- **● Analyzed** (yellow) — At least one equipment item has splash zone results
- **● Complete** (green) — All equipment items have splash zone results and weather window analysis

## UI Layout — New Project Form

```
┌─────────────────────────────────────────────────────────┐
│  New Project                                             │
├─────────────────────────────────────────────────────────┤
│  Project Name: [________________________]                │
│  Description:  [________________________]                │
│  Field Name:   [________________________]                │
│  Water Depth:  [________] m                              │
│                                                          │
│  Select Vessel:                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ○ Seven Seas (PLSV) — 80×25m, OMC 400t           │ │
│  │ ● Skandi Búzios (PLSV) — 90×28m, Knuckle 600t   │ │
│  │ ○ Normand Maximus (HLV) — 120×40m, OMC 5000t     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Cancel]                                    [Create]    │
└─────────────────────────────────────────────────────────┘
```

## Form Fields — New Project

| Field | Type | Validation |
|-------|------|-----------|
| Project Name | text input | Required, min 2 chars |
| Description | textarea | Optional |
| Field Name | text input | Optional |
| Water Depth (m) | number input | Optional, > 0, max 5000 |
| Vessel | radio select from vessel library | Required. Shows vessel name, type, deck size, crane summary |

## UI Layout — Project Workspace Shell

Once a project is opened, the workspace provides a shell with sidebar navigation:

```
┌──────────┬──────────────────────────────────────────────┐
│ PROJECT  │                                               │
│ SIDEBAR  │          ACTIVE SUB-MODULE CONTENT            │
│          │                                               │
│ Overview │          (Deck Layout, or RAO Input,           │
│ Deck     │           or Analysis, etc.)                   │
│ RAO      │                                               │
│ Analysis │                                               │
│ Weather  │                                               │
│ 3D View  │                                               │
│ Report   │                                               │
│          │                                               │
│──────────│                                               │
│ Vessel:  │                                               │
│ 7 Seas   │                                               │
│ Status:  │                                               │
│ ● Draft  │                                               │
└──────────┴──────────────────────────────────────────────┘
```

The sidebar shows:
- Navigation links to each sub-module
- Current vessel name (read-only)
- Project status indicator
- Equipment count summary (e.g., "4 items, 2 analyzed")

The **Overview** page shows a project summary dashboard:
- Project info (name, field, water depth)
- Vessel summary (deck size, crane type)
- Equipment items table with status per item (positioned? deck capacity ok? crane ok? analyzed?)
- Quick action buttons: "Go to Deck Layout", "Run Analysis for All"

## Data Operations

### Create Project
1. Validate form with Zod
2. Insert `project` record with `vessel_id` and `status = "draft"`
3. Redirect to project workspace

### Delete Project
1. Show confirmation dialog: "This will delete all equipment placements, RAOs, analysis results, and weather data for this project."
2. On confirm: delete `project` (cascades to all child tables)
3. Redirect to project list

### Status Updates
Status is auto-calculated, not manually set:
- `"draft"` → no `splash_zone_result` exists for any equipment in this project
- `"analyzed"` → at least one equipment item has a `splash_zone_result`
- `"complete"` → all equipment items have both `splash_zone_result` and `weather_window_result`

Status is recalculated on every project load and after any analysis run.

## Acceptance Criteria

1. ✅ User can create a project by selecting a vessel and filling in basic info
2. ✅ Project list shows all projects with name, vessel, field, status, equipment count
3. ✅ Opening a project shows the workspace shell with sidebar navigation
4. ✅ Overview page shows project summary with per-equipment status
5. ✅ Deleting a project removes all associated data (confirmation required)
6. ✅ Status auto-updates based on analysis completion
7. ✅ All data persists to Supabase
