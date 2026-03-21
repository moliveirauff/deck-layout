# Module 04 — Deck Layout 2D

## Objective

Provide an interactive 2D top-down canvas where the user drags equipment from the global library onto the vessel deck, positioning items while respecting barriers and deck load limits.

## User Stories

1. As an engineer, I want to see the vessel deck with barriers and load zones in a 2D top-down view.
2. As an engineer, I want to drag equipment from a sidebar panel onto the deck to position it.
3. As an engineer, I want to move and rotate placed equipment on the deck.
4. As an engineer, I want visual feedback when equipment overlaps a barrier or exceeds deck load capacity.
5. As an engineer, I want to see the crane position and its radius arc on the deck.
6. As an engineer, I want to remove equipment from the deck.

## Route

```
/#/projects/:id/deck    → Deck Layout 2D
```

## UI Layout

```
┌──────────┬───────────────────────────────────────┬──────────┐
│ PROJECT  │         2D CANVAS (Konva)              │ EQUIP    │
│ SIDEBAR  │                                        │ PANEL    │
│          │   ┌──────────────────────────┐         │          │
│ Overview │   │    VESSEL DECK           │         │ Library: │
│ Deck ◄── │   │                          │         │          │
│ RAO      │   │   [barrier]  [barrier]   │         │ Manif.M1 │
│ Analysis │   │                          │         │  5×3×2.5 │
│ Weather  │   │      [Equipment A]       │         │  25t     │
│ 3D View  │   │                  ◉ crane │         │ [drag]   │
│ Report   │   │   [Equipment B]   ╱      │         │          │
│          │   │                  ╱ arc    │         │ PLET-A   │
│          │   │                          │         │  3×2×1.5 │
│          │   └──────────────────────────┘         │  8t      │
│          │                                        │ [drag]   │
│          │   [Zoom +] [Zoom -] [Fit] [Grid on/off]│          │
└──────────┴───────────────────────────────────────┴──────────┘
```

## Canvas Elements (Konva Layers)

Layers render bottom to top:

| Layer | Z-order | Elements |
|-------|---------|----------|
| Grid | 0 | Light gray grid lines (every 5m), coordinate labels |
| Deck | 1 | Deck outline (gray filled rectangle with border) |
| Deck Load Zones | 2 | Blue semi-transparent rectangles with capacity labels |
| Barriers | 3 | Red filled rectangles with name labels |
| Equipment | 4 | Green rectangles (box) or ellipses (cylinder top-view) with name labels. Selected item has blue border + handles |
| Crane | 5 | Crane pedestal (black circle), radius arc (dashed line), capacity label at arc |
| Validation | 6 | Red warning icons on equipment items with issues |

## Equipment Panel (Right Sidebar)

### Available Equipment

Shows all items from `equipment_library` as draggable cards:

```
┌─ Available Equipment ───────────┐
│ [Search: ____________]          │
│                                  │
│ ┌─ Manifold M1 ──────────────┐ │
│ │ Box | 5.0×3.0×2.5m | 25.0t│ │
│ │         ⠿ drag to deck     │ │
│ └────────────────────────────┘ │
│ ┌─ PLET-A ───────────────────┐ │
│ │ Box | 3.0×2.0×1.5m |  8.0t│ │
│ │         ⠿ drag to deck     │ │
│ └────────────────────────────┘ │
└─────────────────────────────────┘
```

### Placed Equipment (below available list)

Shows items already on deck with status indicators:

```
┌─ On Deck (3 items) ─────────────┐
│                                  │
│ ✅ Manifold M1 — 25.0t          │
│    Deck load: OK | Crane: OK    │
│                                  │
│ ⚠️ PLET-A — 8.0t                │
│    Deck load: OK | Crane: —     │
│    (no overboard position set)   │
│                                  │
│ ❌ Template T1 — 45.0t          │
│    Deck load: OVER LIMIT        │
│                                  │
└─────────────────────────────────┘
```

## Interactions

### Drag from Library to Deck

1. User drags an equipment card from the right panel
2. On drop over the deck canvas: create a `project_equipment` record
3. Equipment appears at drop position as a colored rectangle
4. Default rotation: 0°
5. Immediately run validation checks (bounds, barriers, deck load)

### Move Equipment on Deck

1. User clicks an equipment item on canvas → selected (blue border + drag handles)
2. User drags to new position
3. On drag end: update position, re-run validation
4. Position snaps to 0.5m grid (optional, toggleable)

### Rotate Equipment

1. User selects equipment
2. Rotation handle at top of selection or rotation input in properties panel
3. Rotates in 15° increments (or free rotation with Shift key)
4. Rectangular footprint rotates on canvas

### Remove Equipment from Deck

1. User selects equipment
2. Press Delete key or click Remove button
3. Confirmation dialog: "Remove [equipment name] from deck? This will also remove any analysis results."
4. On confirm: delete `project_equipment` record (cascades to splash_zone_result, etc.)

### Select Equipment

1. Click on equipment → shows properties panel:
   - Name, dimensions, weight
   - Current position (X, Y) — editable for precise placement
   - Rotation — editable
   - Deck load check result
   - Crane capacity check result (deck position)

## Validation Checks (Real-Time)

Run every time equipment is placed or moved:

### 1. Bounds Check
- Equipment footprint (including rotation) must be fully within deck outline
- If out of bounds: red border on equipment, warning icon

### 2. Barrier Collision
- Equipment footprint must not overlap any barrier rectangle
- Check uses axis-aligned bounding box (AABB) with rotation considered
- If collision: red border, warning icon, barrier highlights

### 3. Deck Load Capacity
- Calculate equipment pressure: `dry_weight_t / (length_m × width_m)` (footprint area)
- Find which deck load zone(s) the equipment overlaps
- If pressure > zone capacity: red warning, "DECK LOAD: X t/m² > limit Y t/m²"
- If equipment is not within any deck load zone: yellow warning, "No deck load zone defined at this position"

### 4. Equipment Overlap
- Two equipment items cannot overlap each other
- If overlap detected: red border on both items

## Crane Visualization on Canvas

The crane is shown as a reference overlay:

- **Pedestal:** Solid black circle at crane pedestal position
- **Current radius arc:** When an equipment item is selected, show a dashed arc at the radius from pedestal to equipment center. Label with capacity at that radius.
- **Maximum reach:** Faint dashed circle showing the crane's maximum radius
- **Slew limits:** If slew is limited (not 360°), show the arc only within the slew range

The crane visualization connects to Module 05 (Crane Interaction) for the full positioning workflow.

## Canvas Controls

| Control | Action |
|---------|--------|
| Mouse wheel | Zoom in/out |
| Click + drag on empty space | Pan canvas |
| Click on equipment | Select |
| Drag equipment | Move |
| Delete key | Remove selected equipment (with confirmation) |
| Ctrl+Z | Undo last move/place |
| Grid toggle button | Show/hide 5m grid |
| Snap toggle button | Enable/disable 0.5m snap |
| Fit button | Auto-zoom to show full deck |

## Data Operations

### On Equipment Drop
1. Create `project_equipment` record with `project_id`, `equipment_id`, `deck_pos_x`, `deck_pos_y`, `deck_rotation_deg = 0`
2. Run validation checks
3. Save validation results (`deck_load_ok`)

### On Equipment Move/Rotate
1. Update `project_equipment` position and rotation
2. Re-run validation checks
3. If crane positions were defined (M5), recalculate crane radii and capacities

### On Page Load
1. Load vessel data (deck, barriers, load zones, crane) from Supabase via vessel_id
2. Load all `project_equipment` for this project (with joined equipment_library data)
3. Render deck and all items
4. Run validation checks for all items

## Acceptance Criteria

1. ✅ Deck displays with correct dimensions, barriers (red), and load zones (blue)
2. ✅ Equipment can be dragged from the library panel onto the deck
3. ✅ Equipment can be moved and rotated on the deck
4. ✅ Real-time validation: bounds, barriers, deck load, overlap — with visual indicators
5. ✅ Crane pedestal and max radius arc are visible on the canvas
6. ✅ Equipment can be removed from deck (with cascade deletion of results)
7. ✅ Canvas supports zoom, pan, grid toggle, snap toggle
8. ✅ Equipment properties panel shows position, dimensions, weight, validation status
9. ✅ All positions persist to Supabase
10. ✅ Undo works for move and place operations
