# SubLift — Data Model

## Overview

All data is stored in Supabase (PostgreSQL). The model is organized around three concepts:

- **Global Libraries** — Vessels and equipment definitions that are reusable across projects
- **Project** — A single installation operation that references a vessel and contains equipment placements, RAOs, analysis results, and weather window data
- **Results** — Calculated outputs (splash zone analysis, sea state limits, weather windows) stored per equipment item

## Entity Relationship Diagram

```
vessel (global library)
   ├── vessel_barrier
   ├── deck_load_zone
   └── crane_curve_point
        │
        │ referenced by
        ▼
     project ─────────── project_equipment ─────────── splash_zone_result
        │                     │                              │
        │                     ├── deck_position              └── sea_state_limit
        │                     └── overboard_position
        │
        ├── rao_entry
        ├── scatter_diagram_entry
        └── weather_window_result
        
equipment_library (global library)
        │
        │ referenced by
        ▼
   project_equipment
```

## Tables

---

### 1. `vessel`

Global catalog of vessels with their deck geometry and crane configuration. Reusable across projects.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `name` | text | yes | Vessel name (e.g., "Seven Seas", "Skandi Búzios") |
| `vessel_type` | text | yes | `"PLSV"`, `"LCV"`, or `"HLV"` |
| `description` | text | no | Optional notes (e.g., "Subsea7 PLSV, Brazil fleet") |
| `deck_length_m` | numeric | yes | Deck usable length in meters |
| `deck_width_m` | numeric | yes | Deck usable width (beam) in meters |
| `deck_origin_x` | numeric | yes | X coordinate of deck origin. Default: 0 |
| `deck_origin_y` | numeric | yes | Y coordinate of deck origin. Default: 0 |
| `crane_type` | text | yes | `"OMC"` or `"knuckle_boom"` |
| `crane_pedestal_x` | numeric | yes | Crane pedestal X position on deck (meters from deck origin) |
| `crane_pedestal_y` | numeric | yes | Crane pedestal Y position on deck |
| `crane_pedestal_height_m` | numeric | yes | Height of crane pedestal above deck (meters) |
| `crane_boom_length_m` | numeric | yes | Main boom length in meters |
| `crane_jib_length_m` | numeric | no | Jib (secondary boom) length for knuckle boom. Null for OMC |
| `crane_slew_min_deg` | numeric | no | Minimum slew angle (rotation) in degrees. Default: 0 |
| `crane_slew_max_deg` | numeric | no | Maximum slew angle. Default: 360 |
| `created_at` | timestamptz | yes | Auto-generated |
| `updated_at` | timestamptz | yes | Auto-updated |

**Notes:**
- Crane is embedded in the vessel table because each vessel has one specific crane installation with fixed pedestal position.
- Deck coordinate system: X = longitudinal (bow direction positive), Y = transversal (port side positive). Origin at stern starboard corner of usable deck.
- If a vessel's crane is modified (e.g., crane upgrade), the user edits the vessel record. Existing projects that reference this vessel are not affected — they store a snapshot of the vessel config at project creation time (see `project.vessel_snapshot`).

---

### 2. `vessel_barrier`

Physical obstructions on the vessel deck where equipment cannot be placed. Belong to the vessel, not the project.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `vessel_id` | uuid (FK → vessel) | yes | Parent vessel |
| `name` | text | yes | Barrier label (e.g., "Pipe Rack", "Moonpool", "Winch") |
| `x_m` | numeric | yes | X position of barrier bottom-left corner |
| `y_m` | numeric | yes | Y position of barrier bottom-left corner |
| `length_m` | numeric | yes | Barrier length along X axis |
| `width_m` | numeric | yes | Barrier width along Y axis |
| `height_m` | numeric | no | Barrier height (for 3D visualization). Default: 1.0 |
| `created_at` | timestamptz | yes | Auto-generated |

---

### 3. `deck_load_zone`

Zones on the vessel deck with defined load capacity. Belong to the vessel.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `vessel_id` | uuid (FK → vessel) | yes | Parent vessel |
| `name` | text | yes | Zone label (e.g., "Main Deck Zone A", "Stern Area") |
| `x_m` | numeric | yes | X position of zone bottom-left corner |
| `y_m` | numeric | yes | Y position of zone bottom-left corner |
| `length_m` | numeric | yes | Zone length along X axis |
| `width_m` | numeric | yes | Zone width along Y axis |
| `capacity_t_per_m2` | numeric | yes | Maximum load capacity in tonnes per square meter |
| `created_at` | timestamptz | yes | Auto-generated |

---

### 4. `crane_curve_point`

Points on the crane load capacity curve. Belong to the vessel's crane.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `vessel_id` | uuid (FK → vessel) | yes | Parent vessel |
| `radius_m` | numeric | yes | Horizontal distance from crane pedestal center to hook (meters) |
| `capacity_t` | numeric | yes | Maximum lifting capacity at this radius (tonnes) |
| `boom_angle_deg` | numeric | no | Boom angle from horizontal at this radius (degrees). For reference/visualization |
| `created_at` | timestamptz | yes | Auto-generated |

**Notes:**
- Points are ordered by `radius_m` ascending.
- The system uses linear interpolation between adjacent points to determine capacity at any given radius.
- For knuckle boom cranes, the curve accounts for the combined boom+jib geometry — the user inputs the effective radius vs. capacity as a single curve.

---

### 5. `equipment_library`

Global catalog of subsea equipment. Not tied to any project or vessel. Reused across projects.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `name` | text | yes | Equipment name (e.g., "Manifold M1", "PLET-A") |
| `description` | text | no | Optional notes |
| `length_m` | numeric | yes | Length in meters (X axis) |
| `width_m` | numeric | yes | Width in meters (Y axis) |
| `height_m` | numeric | yes | Height in meters (Z axis) |
| `dry_weight_t` | numeric | yes | Dry weight in tonnes |
| `geometry_type` | text | yes | `"box"` or `"cylinder"`. Used for auto-calculating hydrodynamic coefficients |
| `submerged_volume_m3` | numeric | no | Override for submerged volume. If null, calculated from geometry |
| `created_at` | timestamptz | yes | Auto-generated |
| `updated_at` | timestamptz | yes | Auto-updated |

**Notes:**
- For `geometry_type = "cylinder"`: `length_m` = cylinder length (axial), `width_m` = diameter. `height_m` is used for vertical orientation reference.
- Hydrodynamic coefficients (Cd, Ca, Cs) are **not stored** — they are calculated at runtime from geometry type and dimensions per DNV-RP-N103.

---

### 6. `project`

One project = one installation operation. References a vessel from the global library and contains multiple equipment items.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `name` | text | yes | Project name (e.g., "Búzios PLET Installation Campaign") |
| `description` | text | no | Optional notes |
| `field_name` | text | no | Oil field or location name |
| `water_depth_m` | numeric | no | Water depth at installation site (meters) |
| `vessel_id` | uuid (FK → vessel) | yes | Reference to the vessel used in this operation |
| `vessel_snapshot` | jsonb | no | Frozen copy of vessel config at project creation. Ensures project data is stable even if vessel master record is later edited. Auto-populated on project creation |
| `status` | text | yes | `"draft"`, `"analyzed"`, `"complete"`. Default: `"draft"` |
| `created_at` | timestamptz | yes | Auto-generated |
| `updated_at` | timestamptz | yes | Auto-updated |

**Notes:**
- `vessel_id` links to the live vessel record (for display purposes and to load barriers/crane/deck load zones).
- `vessel_snapshot` is a JSON snapshot of the vessel + barriers + deck load zones + crane curve at the moment of project creation. This protects the project from changes to the master vessel record. If the user wants to pick up the latest vessel data, they can explicitly "refresh from master".
- For MVP, the snapshot is optional — the system can always read live data from the vessel record. The snapshot mechanism is defined here for future-proofing.

---

### 7. `project_equipment`

An equipment item placed on the deck within a specific project. References the global equipment library and adds project-specific positioning data.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `project_id` | uuid (FK → project) | yes | Parent project |
| `equipment_id` | uuid (FK → equipment_library) | yes | Reference to global equipment catalog |
| `label` | text | no | Optional project-specific label override (e.g., "Manifold #2 - Well B") |
| `deck_pos_x` | numeric | yes | Equipment center X position on deck (meters) |
| `deck_pos_y` | numeric | yes | Equipment center Y position on deck (meters) |
| `deck_rotation_deg` | numeric | yes | Equipment rotation angle on deck (degrees). Default: 0 |
| `overboard_pos_x` | numeric | no | Equipment center X at overboard position (meters). Null if not yet defined |
| `overboard_pos_y` | numeric | no | Equipment center Y at overboard position |
| `crane_slew_deck_deg` | numeric | no | Crane slew angle for deck pick-up (degrees) |
| `crane_boom_angle_deck_deg` | numeric | no | Crane boom angle for deck pick-up (degrees) |
| `crane_radius_deck_m` | numeric | no | Crane radius at deck pick-up (auto-calculated from crane geometry and equipment position) |
| `crane_capacity_deck_t` | numeric | no | Crane capacity at deck pick-up radius (auto-calculated from crane curve) |
| `crane_slew_overboard_deg` | numeric | no | Crane slew angle for overboard position (degrees) |
| `crane_boom_angle_overboard_deg` | numeric | no | Crane boom angle for overboard position (degrees) |
| `crane_radius_overboard_m` | numeric | no | Crane radius at overboard position |
| `crane_capacity_overboard_t` | numeric | no | Crane capacity at overboard radius |
| `deck_load_ok` | boolean | no | Whether equipment weight respects deck load zone capacity at its position |
| `capacity_check_deck_ok` | boolean | no | Whether crane capacity ≥ equipment weight at deck position |
| `capacity_check_overboard_ok` | boolean | no | Whether crane capacity ≥ equipment weight at overboard position |
| `created_at` | timestamptz | yes | Auto-generated |
| `updated_at` | timestamptz | yes | Auto-updated |

**Notes:**
- `crane_radius_*` and `crane_capacity_*` fields are computed and saved when the user positions the crane. They are recalculated if the user moves the equipment or the crane.
- The `*_ok` boolean fields are validation flags shown in the UI (green/red indicators).

---

### 8. `rao_entry`

Vessel RAO (Response Amplitude Operator) data. One set of RAOs per project. RAOs are project-specific (not vessel-specific) because they depend on vessel loading condition which varies per operation.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `project_id` | uuid (FK → project) | yes | Parent project |
| `wave_direction_deg` | numeric | yes | Wave direction relative to vessel heading (0=head seas, 90=beam, 180=following) |
| `wave_period_s` | numeric | yes | Wave period in seconds |
| `heave_amplitude_m_per_m` | numeric | yes | Heave RAO: meters of heave per meter of wave amplitude |
| `heave_phase_deg` | numeric | yes | Heave phase angle in degrees |
| `roll_amplitude_deg_per_m` | numeric | yes | Roll RAO: degrees of roll per meter of wave amplitude |
| `roll_phase_deg` | numeric | yes | Roll phase angle in degrees |
| `pitch_amplitude_deg_per_m` | numeric | yes | Pitch RAO: degrees of pitch per meter of wave amplitude |
| `pitch_phase_deg` | numeric | yes | Pitch phase angle in degrees |
| `created_at` | timestamptz | yes | Auto-generated |

**Notes:**
- RAOs are project-level (not vessel-level) because they depend on the vessel's loading condition (draft, trim, cargo), which changes per operation.
- RAOs define how the vessel responds to waves. Combined with crane geometry (pedestal position, boom length, boom angle), they are used to calculate crane tip motion.
- The system needs heave, roll, and pitch to compute vertical and horizontal crane tip displacements.
- Typical input: a table with ~10-20 wave directions × ~20-30 wave periods = 200-600 rows.
- For MVP, wave direction can be simplified to a single direction (beam seas, worst case) if full directional data is not available.

---

### 9. `splash_zone_result`

Results of the DNV splash zone analysis for a specific equipment item.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `project_equipment_id` | uuid (FK → project_equipment) | yes | The equipment item analyzed |
| `cd_x` | numeric | yes | Drag coefficient in X direction (calculated) |
| `cd_y` | numeric | yes | Drag coefficient in Y direction |
| `cd_z` | numeric | yes | Drag coefficient in Z direction |
| `ca` | numeric | yes | Added mass coefficient (calculated) |
| `cs` | numeric | yes | Slamming coefficient (calculated) |
| `projected_area_x_m2` | numeric | yes | Projected area in X direction (m²) |
| `projected_area_y_m2` | numeric | yes | Projected area in Y direction (m²) |
| `projected_area_z_m2` | numeric | yes | Projected area in Z direction (m²) |
| `submerged_volume_m3` | numeric | yes | Submerged volume used in calculation |
| `crane_tip_heave_m` | numeric | yes | Significant crane tip heave amplitude (meters) |
| `crane_tip_lateral_m` | numeric | yes | Significant crane tip lateral amplitude (meters) |
| `daf` | numeric | yes | Dynamic Amplification Factor |
| `max_hs_m` | numeric | yes | Maximum allowable significant wave height (meters) |
| `calculated_at` | timestamptz | yes | When the analysis was run |
| `created_at` | timestamptz | yes | Auto-generated |

---

### 10. `sea_state_limit`

Operability table: Hs/Tp combinations and their pass/fail status for a specific equipment item. Generated by the DNV splash zone analysis.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `splash_zone_result_id` | uuid (FK → splash_zone_result) | yes | Parent analysis result |
| `hs_m` | numeric | yes | Significant wave height (meters) |
| `tp_s` | numeric | yes | Peak wave period (seconds) |
| `is_feasible` | boolean | yes | Whether the lift is feasible at this Hs/Tp combination |
| `utilization_pct` | numeric | yes | Crane utilization percentage at this sea state (dynamic load / crane capacity × 100) |
| `created_at` | timestamptz | yes | Auto-generated |

**Notes:**
- The system generates a grid of Hs (e.g., 0.5 to 4.0m in 0.25m steps) × Tp (e.g., 4 to 16s in 1s steps) and evaluates each combination.
- `is_feasible = true` when total dynamic load (static weight + hydrodynamic forces + dynamic amplification) ≤ crane capacity at overboard position.
- `utilization_pct` allows the engineer to see how close to the limit each sea state is.

---

### 11. `scatter_diagram_entry`

Metocean wave scatter diagram data for weather window analysis. One scatter diagram per project.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `project_id` | uuid (FK → project) | yes | Parent project |
| `hs_m` | numeric | yes | Significant wave height (meters) |
| `tp_s` | numeric | yes | Peak wave period (seconds) |
| `occurrence_pct` | numeric | yes | Percentage of time this Hs/Tp combination occurs (0-100) |
| `created_at` | timestamptz | yes | Auto-generated |

**Notes:**
- The scatter diagram is a matrix of Hs × Tp bins with occurrence percentages. All entries should sum to ~100%.
- This is typically provided by the metocean contractor for the specific field/location.

---

### 12. `weather_window_result`

Results of the weather window analysis for the project. One result per equipment item.

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | uuid (PK) | yes | Auto-generated |
| `project_equipment_id` | uuid (FK → project_equipment) | yes | The equipment item |
| `operability_pct` | numeric | yes | Percentage of time the operation is feasible (sum of scatter diagram entries where sea state is within limits) |
| `max_hs_limit_m` | numeric | yes | Maximum Hs from splash zone analysis |
| `calculated_at` | timestamptz | yes | When the analysis was run |
| `created_at` | timestamptz | yes | Auto-generated |

---

## Type Definitions (TypeScript)

These types mirror the database tables and are used throughout the frontend application.

```typescript
// Geometry type for equipment shape classification
type GeometryType = "box" | "cylinder";

// Vessel type classification
type VesselType = "PLSV" | "LCV" | "HLV";

// Crane type classification
type CraneType = "OMC" | "knuckle_boom";

// Project status
type ProjectStatus = "draft" | "analyzed" | "complete";
```

## Relationships Summary

| Parent | Child | Relationship | Cascade Delete |
|--------|-------|-------------|----------------|
| vessel | vessel_barrier | 1:N | Yes |
| vessel | deck_load_zone | 1:N | Yes |
| vessel | crane_curve_point | 1:N | Yes |
| vessel | project | 1:N | No (restrict — cannot delete vessel used by projects) |
| project | project_equipment | 1:N | Yes |
| project | rao_entry | 1:N | Yes |
| project | scatter_diagram_entry | 1:N | Yes |
| equipment_library | project_equipment | 1:N | No (restrict — cannot delete equipment used in projects) |
| project_equipment | splash_zone_result | 1:1 | Yes |
| project_equipment | weather_window_result | 1:1 | Yes |
| splash_zone_result | sea_state_limit | 1:N | Yes |

**Cascade delete:** Deleting a project deletes all its children (equipment placements, RAOs, scatter data, results). Deleting a vessel or equipment library item is **blocked** if they are referenced by any project.

## Supabase-Specific Notes

### Row Level Security (RLS)

For MVP single-user, all tables have a permissive RLS policy:

```sql
CREATE POLICY "Allow all access" ON table_name
  FOR ALL USING (true) WITH CHECK (true);
```

When authentication is added in the future, policies will filter by `auth.uid()`.

### Indexes

Recommended indexes for query performance:

```sql
CREATE INDEX idx_vessel_barrier_vessel ON vessel_barrier(vessel_id);
CREATE INDEX idx_deck_load_zone_vessel ON deck_load_zone(vessel_id);
CREATE INDEX idx_crane_curve_point_vessel ON crane_curve_point(vessel_id);
CREATE INDEX idx_project_vessel ON project(vessel_id);
CREATE INDEX idx_project_equipment_project ON project_equipment(project_id);
CREATE INDEX idx_project_equipment_equipment ON project_equipment(equipment_id);
CREATE INDEX idx_rao_entry_project ON rao_entry(project_id);
CREATE INDEX idx_scatter_diagram_entry_project ON scatter_diagram_entry(project_id);
CREATE INDEX idx_sea_state_limit_result ON sea_state_limit(splash_zone_result_id);
```

### Migration Order

Tables must be created in this order due to foreign key dependencies:

1. `vessel`
2. `vessel_barrier`
3. `deck_load_zone`
4. `crane_curve_point`
5. `equipment_library`
6. `project`
7. `project_equipment`
8. `rao_entry`
9. `splash_zone_result`
10. `sea_state_limit`
11. `scatter_diagram_entry`
12. `weather_window_result`
