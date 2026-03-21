# Module 05 — Crane Interaction

## Objective

Allow the user to position the crane for each equipment item in two states (deck pick-up and overboard deployment), toggle between them visually, and verify crane capacity at both positions. This module feeds crane geometry data into the DNV analysis.

## User Stories

1. As an engineer, I want to see the crane position for picking up an equipment item from the deck and verify capacity.
2. As an engineer, I want to set the overboard position where the equipment will be lowered through the splash zone.
3. As an engineer, I want to toggle between deck and overboard positions to compare crane configurations.
4. As an engineer, I want immediate visual feedback showing crane radius, boom angle, and available capacity.
5. As an engineer, I want a clear pass/fail indicator for each position.

## Route

This module operates within the Deck Layout 2D page:
```
/#/projects/:id/deck    → same canvas, crane interaction mode activates on equipment selection
```

## UI — Crane Interaction Panel

When an equipment item is selected on the deck canvas, the bottom panel or side panel expands to show crane details:

```
┌─────────────────────────────────────────────────────────────────┐
│  Crane Interaction — Manifold M1 (25.0 t)                       │
├─────────────────────────────┬───────────────────────────────────┤
│                              │                                   │
│   TOGGLE: [● Deck] [Overb.] │    CRANE DATA                     │
│                              │                                   │
│   2D CANVAS shows:           │    Crane Radius:    18.5 m        │
│   - Crane at current pos     │    Boom Angle:      52.3°         │
│   - Radius line to equip     │    Capacity @ rad:  245.0 t       │
│   - Capacity arc             │    Equipment Wt:     25.0 t       │
│   - Green/red indicator      │    Utilization:      10.2%        │
│                              │    Status:         ✅ OK           │
│                              │                                   │
│                              │    [Set Overboard Position →]     │
│                              │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

## Position Toggle — Core UX

The toggle switches between two states:

### State: Deck Position (Pick-up)

- Equipment shown at its **deck position** (where it sits on deck)
- Crane boom rotated to point at equipment center
- Radius line drawn from pedestal to equipment
- Capacity indicator shows interpolated value from crane curve at this radius
- **This position is auto-calculated** from equipment deck position — user doesn't manually set it

### State: Overboard Position (Splash Zone)

- Equipment shown at the **overboard position** (over the vessel side/stern)
- Crane boom rotated to the overboard direction
- Radius line drawn from pedestal to overboard position
- Capacity indicator shows value at overboard radius
- **This position is user-defined** — the user either:
  - Drags the equipment to the overboard position on the 2D canvas, or
  - Inputs overboard coordinates manually (X, Y)

### Toggle Behavior

When the user toggles:
1. Canvas animates (smooth transition ~300ms):
   - Crane boom rotates to the new position
   - Equipment fades from one position to the other
   - Radius line and capacity arc update
2. Crane data panel updates with values for the selected state
3. Status indicator updates (✅ or ❌)

## Setting the Overboard Position

**Method 1: Drag on Canvas**
1. User toggles to Overboard mode
2. Equipment item becomes draggable to any position (including outside deck boundaries — overboard is typically over the water)
3. The canvas extends slightly beyond the deck outline to allow overboard placement
4. Crane radius and capacity update in real time as user drags

**Method 2: Manual Input**
1. In the Crane Data panel, user inputs Overboard X and Overboard Y coordinates
2. Canvas updates to show equipment at those coordinates
3. Useful for precise positioning (e.g., "I need the equipment at exactly 5m off the port side")

**Extended Canvas Area:**
The 2D canvas for overboard positioning shows the deck + a surrounding zone (e.g., 20m beyond deck edges on all sides), representing the water area around the vessel. The area beyond the deck is shown as light blue (water). The overboard position must be reachable by the crane (within max radius and slew limits).

## Validation Rules

| Check | Condition | Indicator |
|-------|-----------|-----------|
| Deck capacity OK | crane_capacity_at_deck_radius ≥ equipment_dry_weight | ✅ Green |
| Deck capacity FAIL | crane_capacity_at_deck_radius < equipment_dry_weight | ❌ Red |
| Overboard capacity OK | crane_capacity_at_overboard_radius ≥ equipment_dry_weight | ✅ Green |
| Overboard capacity FAIL | crane_capacity_at_overboard_radius < equipment_dry_weight | ❌ Red |
| Overboard unreachable | overboard_radius > crane_max_radius | ❌ Red + "Out of reach" |
| Overboard outside slew | overboard_angle outside slew limits | ❌ Red + "Outside slew range" |
| Overboard not set | overboard_pos_x/y are null | ⚠️ Yellow + "Set overboard position" |

**Note:** The static capacity check here uses dry weight only (no dynamic loads). The full dynamic check happens in Module 07 (DNV Splash Zone). This is intentional — the static check is a quick sanity check; the dynamic analysis is the engineering verification.

## Crane Geometry Calculations

### Radius Calculation

```
radius = sqrt((target_x - pedestal_x)² + (target_y - pedestal_y)²)
```

Where target is either the equipment deck position or overboard position.

### Boom Angle Calculation

For OMC (single boom):
```
boom_angle = acos(radius / boom_length)
```
Valid only if `radius ≤ boom_length`.

For Knuckle Boom:
The relationship between radius and boom/jib angles is more complex. For MVP, we use the crane curve directly — the user inputs radius vs. capacity, and the boom angle field in the crane curve is for reference only. The system doesn't solve the inverse kinematics of the knuckle boom.

### Slew Angle Calculation

```
slew_angle = atan2(target_y - pedestal_y, target_x - pedestal_x) × (180/π)
```

Normalized to 0-360° range. Checked against `crane_slew_min_deg` and `crane_slew_max_deg`.

### Capacity Interpolation

Linear interpolation between the two nearest `crane_curve_point` entries:

```
Given radius R between points (R1, C1) and (R2, C2):
capacity = C1 + (C2 - C1) × (R - R1) / (R2 - R1)
```

If R < minimum curve radius or R > maximum curve radius: capacity = 0 (out of range).

## Canvas Visualization Details

### Deck Position Mode
- Equipment at deck position: solid fill
- Crane pedestal: black circle
- Boom line: solid gray line from pedestal to equipment center
- Radius label: "R = 18.5m" along the line
- Capacity arc: dashed green (OK) or red (FAIL) arc at this radius
- Capacity label: "245t" near the arc

### Overboard Position Mode
- Equipment at deck position: ghost (very faint, 20% opacity)
- Equipment at overboard position: solid fill with dashed border (indicating it's the overboard position)
- Crane pedestal: black circle
- Boom line: solid gray line from pedestal to overboard position
- Water area: light blue fill beyond deck edges
- Same radius/capacity labels as deck mode

### Both Positions Visible (optional view)
- A third toggle option: "Both" — shows deck position in ghost + overboard position in solid + crane boom path animated between the two

## Data Saved

When the user sets/modifies positions, the following fields on `project_equipment` are updated:

**Auto-calculated on deck position:**
- `crane_slew_deck_deg`
- `crane_boom_angle_deck_deg`
- `crane_radius_deck_m`
- `crane_capacity_deck_t`
- `capacity_check_deck_ok`

**User-defined + auto-calculated on overboard position:**
- `overboard_pos_x` (user sets)
- `overboard_pos_y` (user sets)
- `crane_slew_overboard_deg` (auto-calculated)
- `crane_boom_angle_overboard_deg` (auto-calculated)
- `crane_radius_overboard_m` (auto-calculated)
- `crane_capacity_overboard_t` (auto-calculated)
- `capacity_check_overboard_ok` (auto-calculated)

## Acceptance Criteria

1. ✅ Selecting an equipment item shows the crane interaction panel with crane data
2. ✅ Toggle switches between deck and overboard positions with smooth animation
3. ✅ Deck position: crane radius and capacity auto-calculated from equipment position
4. ✅ Overboard position: user can drag equipment to overboard location or input coordinates
5. ✅ Canvas shows water area beyond deck for overboard placement
6. ✅ Capacity check: green/red indicator for both positions
7. ✅ Out-of-reach and slew-limit violations are detected and shown
8. ✅ All crane data values (radius, angle, capacity, utilization) displayed in panel
9. ✅ Data persists to Supabase on every position change
10. ✅ "Both" view mode shows deck ghost + overboard solid + crane path
