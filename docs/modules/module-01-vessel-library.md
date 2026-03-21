# Module 01 — Vessel Library

## Objective

Provide a global vessel catalog where the user registers and configures vessels (deck geometry, barriers, deck load zones, crane, and crane capacity curve) that can be reused across multiple projects.

## User Stories

1. As an engineer, I want to register a vessel with its deck dimensions so I can reuse it in multiple projects.
2. As an engineer, I want to draw barriers on the deck (pipe racks, moonpool, winches) so the deck layout respects physical obstructions.
3. As an engineer, I want to define deck load zones with capacity limits (t/m²) so the system can validate equipment placement.
4. As an engineer, I want to configure the vessel's crane (type, pedestal position, boom geometry) so the system can calculate lifting capacities.
5. As an engineer, I want to input the crane capacity curve (radius vs. tonnage) so the system knows the crane's limits at any reach.
6. As an engineer, I want to see a list of all registered vessels so I can select one when creating a project.
7. As an engineer, I want to edit or delete a vessel as long as it is not used in any project.

## Route

```
/#/vessels              → Vessel list (cards or table)
/#/vessels/new          → New vessel form
/#/vessels/:id          → Vessel editor (tabbed: Deck, Barriers, Deck Load, Crane, Crane Curve)
```

## UI Layout — Vessel Editor

The vessel editor has a **left panel** with a 2D preview of the deck, and a **right panel** with tabbed forms.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Vessels          Seven Seas (PLSV)    [Save] │
├───────────────────────┬─────────────────────────────────┤
│                       │  [Deck] [Barriers] [Load Zones] │
│                       │  [Crane] [Crane Curve]          │
│   2D DECK PREVIEW     │─────────────────────────────────│
│                       │                                  │
│   (Konva canvas)      │   Active tab form content        │
│   Shows:              │                                  │
│   - Deck outline      │   e.g., Deck tab:                │
│   - Barriers (red)    │   • Deck Length: [____] m         │
│   - Load zones (blue) │   • Deck Width:  [____] m         │
│   - Crane pedestal    │                                  │
│   - Crane radius arc  │                                  │
│                       │                                  │
└───────────────────────┴─────────────────────────────────┘
```

## Tab Details

### Tab 1: Deck

Basic vessel identification and deck dimensions.

| Field | Type | Validation |
|-------|------|-----------|
| Vessel Name | text input | Required, min 2 chars |
| Vessel Type | dropdown | "PLSV", "LCV", "HLV" |
| Description | textarea | Optional |
| Deck Length (m) | number input | Required, > 0, max 300 |
| Deck Width (m) | number input | Required, > 0, max 60 |

On change, the 2D preview updates the deck outline in real time.

### Tab 2: Barriers

List of rectangular barriers on the deck. User can add, edit, remove barriers. Each barrier appears in the 2D preview as a red rectangle.

| Field | Type | Validation |
|-------|------|-----------|
| Name | text input | Required |
| X Position (m) | number input | Required, ≥ 0, ≤ deck_length |
| Y Position (m) | number input | Required, ≥ 0, ≤ deck_width |
| Length (m) | number input | Required, > 0 |
| Width (m) | number input | Required, > 0 |
| Height (m) | number input | Optional, default 1.0. For 3D visualization |

**Interaction:** User can also click on the 2D preview to place a barrier, then adjust size by dragging handles. This is a convenience feature — coordinate input is the primary method.

### Tab 3: Deck Load Zones

List of rectangular zones with load capacity. User can add, edit, remove zones. Each zone appears in the 2D preview as a blue semi-transparent rectangle with the capacity label.

| Field | Type | Validation |
|-------|------|-----------|
| Zone Name | text input | Required |
| X Position (m) | number input | Required, ≥ 0, ≤ deck_length |
| Y Position (m) | number input | Required, ≥ 0, ≤ deck_width |
| Length (m) | number input | Required, > 0 |
| Width (m) | number input | Required, > 0 |
| Capacity (t/m²) | number input | Required, > 0 |

**Note:** Deck load zones can overlap. If an equipment item sits on the intersection of two zones, the minimum capacity applies.

### Tab 4: Crane

Crane configuration. Fields depend on crane type.

| Field | Type | Validation | Applies to |
|-------|------|-----------|-----------|
| Crane Type | dropdown | "OMC", "Knuckle Boom" | All |
| Pedestal X (m) | number input | Required, within deck bounds | All |
| Pedestal Y (m) | number input | Required, within deck bounds | All |
| Pedestal Height (m) | number input | Required, > 0 | All |
| Main Boom Length (m) | number input | Required, > 0 | All |
| Jib Length (m) | number input | Required, > 0 | Knuckle Boom only |
| Min Slew Angle (°) | number input | Default: 0 | All |
| Max Slew Angle (°) | number input | Default: 360 | All |

On change, the 2D preview updates the crane pedestal marker and draws the maximum radius arc (based on crane curve, see below).

**Crane Type Behavior:**
- **OMC:** Single straight boom. Radius varies by changing boom angle (luffing). Radius = boom_length × cos(boom_angle).
- **Knuckle Boom:** Main boom + articulated jib. More complex radius geometry, but for the crane curve input, the user provides the effective radius directly (the combined effect of boom + jib at various configurations).

### Tab 5: Crane Curve

The crane capacity curve: a table of (radius, capacity) points. This is the most critical input for the vessel.

**UI:** An editable table with an Add Row button, plus a chart (Recharts) showing the curve visually.

```
┌─────────────────────────────────────────────┐
│  Crane Capacity Curve                [+ Add] │
├──────────┬──────────────┬───────────────────┤
│ Radius(m)│ Capacity (t) │ Boom Angle (°)    │
├──────────┼──────────────┼───────────────────┤
│   10.0   │    400       │   72              │
│   15.0   │    300       │   65              │
│   20.0   │    220       │   55              │
│   25.0   │    160       │   42              │
│   30.0   │    100       │   30              │
│   35.0   │     60       │   15              │
└──────────┴──────────────┴───────────────────┘

    Capacity (t)
    400 │ ●
        │   ●
    300 │     ●
        │       ●
    200 │         ●
        │           ●
    100 │             ●
        │               ●
      0 └───────────────────
        10  15  20  25  30  35
              Radius (m)
```

| Field | Type | Validation |
|-------|------|-----------|
| Radius (m) | number input | Required, > 0. Must be unique (no duplicate radii) |
| Capacity (t) | number input | Required, > 0. Should decrease as radius increases (warning if not) |
| Boom Angle (°) | number input | Optional. For reference and 3D visualization |

**Validation Rules:**
- Minimum 2 points required to define a curve
- Radii must be unique (sorted ascending on save)
- If capacity does not decrease monotonically, show a warning (not a block — some cranes have non-monotonic curves)

## 2D Preview (Konva Canvas)

The left-panel preview is a simplified top-down view showing:

| Element | Visual |
|---------|--------|
| Deck outline | Gray rectangle with dimensions labeled |
| Barriers | Red filled rectangles with name labels |
| Deck load zones | Blue semi-transparent rectangles with capacity labels |
| Crane pedestal | Black circle at pedestal position |
| Crane max radius | Dashed circle arc from min slew to max slew at maximum crane radius |
| Crane min radius | Dotted circle arc at minimum crane radius |
| Coordinate axes | X arrow (bow), Y arrow (port) at deck origin |
| Grid | Light gray grid every 5m |
| Scale bar | Shows real-world scale |

The preview auto-zooms to fit the deck with some padding. The user can pan and zoom the preview.

## Data Operations

### Save

When user clicks Save:
1. Validate all fields with Zod
2. Upsert `vessel` record
3. Delete all existing `vessel_barrier` for this vessel, insert new ones (replace strategy)
4. Delete all existing `deck_load_zone` for this vessel, insert new ones
5. Delete all existing `crane_curve_point` for this vessel, insert new ones
6. Show success toast

Replace strategy (delete all + insert) is simpler than diffing individual records for the MVP. Acceptable because these are small datasets (< 50 records per vessel).

### Delete

- Only allowed if no `project` references this vessel
- Show confirmation dialog
- On confirm: delete vessel + cascade (barriers, zones, curve points)

### List Page

The vessel list page shows a card or table for each vessel:

```
┌──────────────────────────────────────────┐
│  Vessel Library                   [+ New] │
├──────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────┐ │
│  │ Seven Seas       │  │ Skandi Búzios│ │
│  │ PLSV             │  │ PLSV         │ │
│  │ Deck: 80×25m     │  │ Deck: 90×28m │ │
│  │ Crane: OMC       │  │ Crane: KB    │ │
│  │ Max cap: 400t    │  │ Max cap: 600t│ │
│  │ [Edit] [Delete]  │  │ [Edit] [Del] │ │
│  └──────────────────┘  └──────────────┘ │
└──────────────────────────────────────────┘
```

Each card shows: name, type, deck dimensions, crane type, maximum crane capacity (first point in curve).

## Acceptance Criteria

1. ✅ User can create a new vessel with deck dimensions
2. ✅ User can add/edit/remove barriers that appear on the 2D preview
3. ✅ User can add/edit/remove deck load zones that appear on the 2D preview
4. ✅ User can configure crane type and geometry
5. ✅ User can input crane curve points in a table and see the chart
6. ✅ All data persists to Supabase and loads correctly on page refresh
7. ✅ Vessel list shows all vessels with summary info
8. ✅ Cannot delete a vessel that is used in a project (show error message)
9. ✅ 2D preview updates in real time as user edits any tab
10. ✅ Validation prevents saving invalid data (missing required fields, out-of-range values)
