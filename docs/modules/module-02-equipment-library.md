# Module 02 — Equipment Library

## Objective

Provide a global catalog of subsea equipment (manifolds, PLETs, templates, jumpers, etc.) with geometry and weight data, reusable across projects.

## User Stories

1. As an engineer, I want to register subsea equipment with dimensions and weight so I can reuse them across projects.
2. As an engineer, I want to classify equipment as "box" or "cylinder" so the system can auto-calculate hydrodynamic coefficients.
3. As an engineer, I want to see all registered equipment in a searchable list.
4. As an engineer, I want to edit or delete equipment as long as it is not used in any project.

## Route

```
/#/equipment              → Equipment list (table)
/#/equipment/new          → New equipment form
/#/equipment/:id          → Equipment editor
```

## UI Layout — Equipment Editor

Simple form layout with a 3D mini-preview showing the equipment shape at real proportions.

```
┌─────────────────────────────────────────────────────────┐
│  ← Back to Equipment       Manifold M1           [Save] │
├───────────────────────┬─────────────────────────────────┤
│                       │                                  │
│   3D MINI-PREVIEW     │   Name: [________________]       │
│                       │   Description: [__________]      │
│   (Three.js)          │   Geometry Type: [Box ▼]         │
│   Shows the equipment │   Length (m): [____]              │
│   shape as a box or   │   Width (m):  [____]              │
│   cylinder at real    │   Height (m): [____]              │
│   proportions with    │   Dry Weight (t): [____]          │
│   dimension labels    │   Submerged Volume (m³): [____]   │
│                       │     ↑ optional override           │
│                       │                                  │
└───────────────────────┴─────────────────────────────────┘
```

## Form Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| Name | text input | Required, min 2 chars | e.g., "Manifold M1", "PLET-A" |
| Description | textarea | Optional | Free-text notes |
| Geometry Type | dropdown | `"box"` or `"cylinder"` | Determines hydrodynamic coefficient calculation method |
| Length (m) | number input | Required, > 0, max 50 | X axis. For cylinder: axial length |
| Width (m) | number input | Required, > 0, max 50 | Y axis. For cylinder: diameter |
| Height (m) | number input | Required, > 0, max 30 | Z axis (vertical) |
| Dry Weight (t) | number input | Required, > 0, max 5000 | Weight in air, in tonnes |
| Submerged Volume (m³) | number input | Optional, > 0 | Override. If blank, system calculates from geometry: box = L×W×H, cylinder = π×(D/2)²×L |

### Geometry Type Behavior

**Box:** Rendered as a rectangular prism in 3D preview. Hydrodynamic coefficients per DNV-RP-N103 table for rectangular shapes.

**Cylinder:** Rendered as a cylinder in 3D preview. Length = axial direction, Width = diameter. Hydrodynamic coefficients per DNV-RP-N103 table for cylindrical shapes.

### Auto-Calculated Values (shown in UI, not stored)

When the user fills in geometry type and dimensions, the UI shows calculated values in a read-only info panel below the form:

```
┌─ Calculated Properties ──────────────────────┐
│  Volume:          12.50 m³  (L × W × H)      │
│  Footprint Area:   5.00 m²  (L × W)          │
│  Deck Pressure:    4.00 t/m² (weight/area)    │
│  Projected Area X: 2.50 m²  (W × H)          │
│  Projected Area Y: 5.00 m²  (L × H)          │
│  Projected Area Z: 5.00 m²  (L × W)          │
└───────────────────────────────────────────────┘
```

These help the engineer validate the input visually. Deck pressure is particularly useful for checking against deck load zones.

## 3D Mini-Preview

A small Three.js canvas showing:
- The equipment shape (box or cylinder) with correct proportions
- Dimension labels on edges (L, W, H with values)
- A grid floor for scale reference
- Auto-rotates slowly or user can orbit with mouse

This is a simplified version of the main 3D viewer — just the equipment item, no vessel.

## Data Operations

### Save
1. Validate all fields with Zod
2. Upsert `equipment_library` record
3. Show success toast

### Delete
- Only allowed if no `project_equipment` references this equipment item
- Show confirmation dialog with list of projects using this item (if any)
- On confirm: delete record

## List Page

```
┌────────────────────────────────────────────────────────────────────┐
│  Equipment Library                              [Search] [+ New]   │
├────────┬──────────┬───────┬───────┬───────┬────────┬──────────────┤
│ Name   │ Type     │ L (m) │ W (m) │ H (m) │ Wt (t) │ Actions      │
├────────┼──────────┼───────┼───────┼───────┼────────┼──────────────┤
│ Manif. │ Box      │  5.0  │  3.0  │  2.5  │  25.0  │ [Edit] [Del] │
│ PLET-A │ Box      │  3.0  │  2.0  │  1.5  │   8.0  │ [Edit] [Del] │
│ Riser  │ Cylinder │ 12.0  │  0.5  │  0.5  │   3.0  │ [Edit] [Del] │
└────────┴──────────┴───────┴───────┴───────┴────────┴──────────────┘
```

Features:
- Sortable columns (click header)
- Text search (filters by name)
- Geometry type filter (dropdown: All, Box, Cylinder)

## Acceptance Criteria

1. ✅ User can create equipment with all required fields
2. ✅ User can select box or cylinder geometry type
3. ✅ 3D mini-preview shows correct shape and proportions, updates in real time
4. ✅ Calculated properties panel shows volume, footprint, projected areas, deck pressure
5. ✅ Equipment list shows all items with sortable columns and search
6. ✅ Cannot delete equipment used in a project (show error with project names)
7. ✅ All data persists to Supabase and loads on refresh
8. ✅ Validation prevents saving invalid data
