# Module 06 — RAO & Crane Tip Motion

## Objective

Allow the user to input vessel RAO (Response Amplitude Operator) data and calculate crane tip motions that feed into the DNV splash zone analysis.

## User Stories

1. As an engineer, I want to input vessel RAO data as a table (wave direction × wave period → heave, roll, pitch).
2. As an engineer, I want to see the RAO data visualized as plots.
3. As an engineer, I want the system to calculate crane tip motion from the RAOs and crane geometry.
4. As an engineer, I want to review the calculated crane tip motions before running the splash zone analysis.

## Route

```
/#/projects/:id/rao     → RAO Input & Crane Tip Motion
```

## UI Layout

```
┌──────────┬──────────────────────────────────────────────┐
│ PROJECT  │                                               │
│ SIDEBAR  │  RAO & Crane Tip Motion                       │
│          │                                               │
│ Overview │  ┌─ RAO Input ────────────────────────────┐  │
│ Deck     │  │  Wave Direction: [270° (Beam) ▼]        │  │
│ RAO ◄──  │  │                                         │  │
│ Analysis │  │  ┌──────┬────────┬────────┬──────────┐ │  │
│ Weather  │  │  │ T(s) │Heave   │Roll    │Pitch     │ │  │
│ 3D View  │  │  │      │Amp|Pha │Amp|Pha │Amp|Pha   │ │  │
│ Report   │  │  ├──────┼────────┼────────┼──────────┤ │  │
│          │  │  │  4.0 │.02|  0 │.5 |  0 │.3 |  0  │ │  │
│          │  │  │  5.0 │.05| 10 │1.2| 15 │.8 | 12  │ │  │
│          │  │  │  6.0 │.10| 25 │2.1| 30 │1.5| 28  │ │  │
│          │  │  │  ... │...     │...     │...       │ │  │
│          │  │  └──────┴────────┴────────┴──────────┘ │  │
│          │  │  [+ Add Row]  [Clear All]  [Save]       │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ RAO Plots ────────────────────────────┐  │
│          │  │  [Heave] [Roll] [Pitch] tabs            │  │
│          │  │  Chart: RAO amplitude vs. wave period   │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Crane Tip Motion Results ─────────────┐  │
│          │  │  Calculated from RAOs + crane geometry   │  │
│          │  │                                         │  │
│          │  │  Crane tip heave (sig.):    1.25 m      │  │
│          │  │  Crane tip lateral (sig.):  0.85 m      │  │
│          │  │  Wave direction used:       270° (Beam) │  │
│          │  │                                         │  │
│          │  │  [Recalculate]                          │  │
│          │  └─────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

## RAO Input Table

### Structure

RAOs are input per wave direction. The user selects a wave direction from a dropdown, then fills in the table for that direction.

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| Wave Period (T) | number | seconds | Wave period |
| Heave Amplitude | number | m/m | Meters of heave per meter of wave amplitude |
| Heave Phase | number | degrees | Phase angle |
| Roll Amplitude | number | deg/m | Degrees of roll per meter of wave amplitude |
| Roll Phase | number | degrees | Phase angle |
| Pitch Amplitude | number | deg/m | Degrees of pitch per meter of wave amplitude |
| Pitch Phase | number | degrees | Phase angle |

### Wave Direction Options

Predefined directions (user can add custom):
- 0° — Head seas
- 45° — Bow quartering
- 90° — Beam seas (starboard)
- 135° — Stern quartering
- 180° — Following seas
- 225° — Stern quartering (port)
- 270° — Beam seas (port)
- 315° — Bow quartering (port)

### Input Methods

**Manual row-by-row:** User clicks "+ Add Row", fills in values. Typical RAO table has 20-30 rows (wave periods from 3s to 25s).

**Paste from clipboard:** User can select a range in Excel, copy, and paste into the table. The system parses tab-separated values and populates rows. This is critical for usability — RAO data usually comes from spreadsheets.

**Quick preset (MVP convenience):** A "Use simplified beam seas" button that generates a basic set of RAOs typical for a PLSV in beam seas. Not for production use — just for testing and demonstration.

## RAO Plots (Recharts)

Three tabs: Heave, Roll, Pitch.

Each plot shows:
- X axis: Wave Period (s)
- Y axis: RAO Amplitude (m/m or deg/m)
- One line per wave direction (color-coded)
- Legend with direction labels

This helps the engineer visually verify the RAO data looks reasonable before proceeding.

## Crane Tip Motion Calculation

### Inputs

- RAO data (from `rao_entry` table)
- Crane pedestal position (from vessel: `crane_pedestal_x`, `crane_pedestal_y`, `crane_pedestal_height_m`)
- Crane boom geometry at overboard position (from `project_equipment`: `crane_radius_overboard_m`, `crane_boom_angle_overboard_deg`)
- Vessel deck reference point (vessel center of rotation)

### Calculation Method (Simplified for MVP)

The crane tip position relative to the vessel's center of motion is:

```
Crane tip position (relative to vessel CoG):
  x_tip = pedestal_x + radius × cos(slew_angle)
  y_tip = pedestal_y + radius × sin(slew_angle)
  z_tip = pedestal_height + boom_length × sin(boom_angle)
```

For a given wave direction and period, the crane tip motions are:

```
Vertical crane tip motion:
  z_ct = heave_RAO × A_wave 
       + pitch_RAO × A_wave × x_tip (pitch coupling)
       + roll_RAO × A_wave × y_tip (roll coupling)

Lateral crane tip motion:
  y_ct = roll_RAO × A_wave × z_tip (roll-induced lateral at height)
```

Where `A_wave` = wave amplitude = Hs / 2 (for significant amplitude).

### Spectral Combination

For each wave period:
1. Calculate crane tip vertical and lateral RAOs (m/m)
2. The significant crane tip motion is:

```
σ_ct = sqrt(Σ S(ω) × |RAO_ct(ω)|² × Δω)
```

For MVP simplification (regular wave approach):
- Use the worst-case wave direction (maximum crane tip motion)
- Use the peak period Tp
- Significant crane tip motion ≈ 2 × σ_ct

### Output

| Value | Unit | Description |
|-------|------|-------------|
| Crane tip heave (significant) | meters | Vertical oscillation amplitude at crane hook |
| Crane tip lateral (significant) | meters | Lateral oscillation amplitude at crane hook |
| Worst-case wave direction | degrees | Which direction produces maximum motion |

These values feed directly into Module 07 (DNV Splash Zone) as inputs for the dynamic load calculation.

### Calculation Per Equipment Item

Crane tip motion depends on the crane geometry at the overboard position, which is different for each equipment item (different radius, different boom angle). Therefore, crane tip motion is calculated **per equipment item**.

However, the RAOs are shared across all equipment items in the project (same vessel, same loading condition).

## Data Operations

### Save RAOs
1. Validate all entries (no negative periods, no negative amplitudes)
2. Delete existing `rao_entry` records for this project
3. Insert all rows (batch insert)
4. Show success toast

### Calculate Crane Tip Motion
1. Verify RAOs exist
2. Verify at least one equipment item has an overboard position defined
3. For each equipment item with overboard position:
   - Calculate crane tip motions using RAOs + crane geometry
   - Store results (crane_tip_heave_m, crane_tip_lateral_m) — these are stored in splash_zone_result when the full analysis runs (M7)
4. Display results in the Crane Tip Motion Results panel

## Acceptance Criteria

1. ✅ User can input RAO data per wave direction in a tabular format
2. ✅ Paste from clipboard (tab-separated Excel data) works
3. ✅ RAO plots show amplitude vs. period for each direction
4. ✅ Crane tip motion calculates automatically when RAOs and equipment positions are available
5. ✅ Results show significant heave and lateral motion per equipment item
6. ✅ RAO data persists to Supabase
7. ✅ Validation prevents invalid RAO values
8. ✅ Quick preset button generates sample beam seas RAOs for testing
