# Module 07 — DNV Splash Zone Calculator

## Objective

Calculate hydrodynamic loads on equipment during splash zone passage per DNV-ST-N001 and determine the maximum allowable sea state (Hs/Tp combinations) for each lift. This is the core engineering calculation of SubLift.

## User Stories

1. As an engineer, I want the system to auto-calculate hydrodynamic coefficients (Cd, Ca, Cs) from equipment geometry.
2. As an engineer, I want to run the splash zone analysis for each equipment item and see the results.
3. As an engineer, I want to see a sea state operability table (Hs × Tp grid) showing which conditions are feasible.
4. As an engineer, I want to know the maximum Hs at which I can install each equipment item.
5. As an engineer, I want to see the utilization percentage at each sea state to understand the safety margin.

## Route

```
/#/projects/:id/analysis    → DNV Splash Zone Analysis
```

## UI Layout

```
┌──────────┬──────────────────────────────────────────────┐
│ PROJECT  │                                               │
│ SIDEBAR  │  DNV Splash Zone Analysis                     │
│          │                                               │
│ Overview │  Equipment: [Manifold M1 ▼]   [Run Analysis]  │
│ Deck     │                                               │
│ RAO      │  ┌─ Input Summary ────────────────────────┐  │
│ Anal. ◄  │  │ Weight: 25.0t | Geometry: Box 5×3×2.5m│  │
│ Weather  │  │ Crane cap @ overboard: 245t             │  │
│ 3D View  │  │ Crane tip heave: 1.25m | lat: 0.85m    │  │
│ Report   │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Hydrodynamic Coefficients ────────────┐  │
│          │  │ Cd_x: 1.20  Cd_y: 1.20  Cd_z: 1.40    │  │
│          │  │ Ca: 1.00    Cs: 5.00                    │  │
│          │  │ Area_x: 7.5m²  Area_y: 12.5m²          │  │
│          │  │ Area_z: 15.0m²  Volume: 37.5m³          │  │
│          │  │ [auto-calculated from geometry]          │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Results ──────────────────────────────┐  │
│          │  │ Max Hs: 2.25 m    DAF: 1.35            │  │
│          │  │ Max utilization at Hs=2.25: 97%         │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Sea State Operability Table ──────────┐  │
│          │  │      Tp(s)→  4   6   8  10  12  14  16 │  │
│          │  │ Hs(m)↓                                  │  │
│          │  │  0.50       🟢  🟢  🟢  🟢  🟢  🟢  🟢 │  │
│          │  │  1.00       🟢  🟢  🟢  🟢  🟢  🟢  🟢 │  │
│          │  │  1.50       🟢  🟢  🟢  🟢  🟢  🟢  🟡 │  │
│          │  │  2.00       🟢  🟢  🟡  🟡  🟡  🔴  🔴 │  │
│          │  │  2.50       🟡  🔴  🔴  🔴  🔴  🔴  🔴 │  │
│          │  │  3.00       🔴  🔴  🔴  🔴  🔴  🔴  🔴 │  │
│          │  │                                         │  │
│          │  │ 🟢 ≤70%  🟡 70-90%  🔴 >90% or fail   │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  [Run All Equipment]                           │
└──────────┴──────────────────────────────────────────────┘
```

## Prerequisites (Checked Before Analysis)

Before running the analysis, the system verifies:

| Prerequisite | Source | Error if missing |
|-------------|--------|------------------|
| Equipment has overboard position | Module 05 | "Set overboard position for this equipment in Deck Layout" |
| Crane capacity at overboard > 0 | Module 05 | "Crane cannot reach overboard position" |
| RAO data exists | Module 06 | "Input vessel RAOs before running analysis" |
| Crane tip motion calculated | Module 06 | "RAOs or crane geometry incomplete" |

## Calculation Pipeline

### Step 1: Hydrodynamic Coefficients (Auto-Calculated)

Based on `geometry_type` and dimensions from `equipment_library`:

**For Box geometry:**

| Coefficient | Value | Reference |
|------------|-------|-----------|
| Cd (drag) | 1.2 (all directions for rectangular prism) | DNV-RP-N103 Table B-2 |
| Ca (added mass) | Interpolated from L/W and W/H ratios per DNV-RP-N103 Table A-1 | DNV-RP-N103 |
| Cs (slamming) | 5.0 (flat bottom) or 3.5 (perforated/open bottom) | DNV-RP-N103 Sec. 4.5 |

**For Cylinder geometry:**

| Coefficient | Value | Reference |
|------------|-------|-----------|
| Cd (drag) | 0.7 (smooth) to 1.2 (rough/marine growth) | DNV-RP-N103 Table B-1 |
| Ca (added mass) | 1.0 for circular cross-section | DNV-RP-N103 Table A-1 |
| Cs (slamming) | π (circular slamming) | DNV-RP-N103 Sec. 4.5 |

**Projected areas:**

```
Box:
  A_x = width × height    (face perpendicular to X)
  A_y = length × height   (face perpendicular to Y)
  A_z = length × width    (bottom face, for slamming)

Cylinder:
  A_x = diameter × length (side, perpendicular to axis)
  A_y = diameter × length (same if horizontal)
  A_z = π × (diameter/2)² (end face)
```

**Submerged volume:**
- Box: `V = length × width × height` (or user override)
- Cylinder: `V = π × (diameter/2)² × length` (or user override)

### Step 2: Sea State Grid Generation

Generate a matrix of Hs × Tp combinations to evaluate:

| Parameter | Range | Step |
|-----------|-------|------|
| Hs | 0.5 m to 4.0 m | 0.25 m |
| Tp | 4 s to 18 s | 1 s |

This produces ~15 × 15 = 225 combinations to evaluate. Configurable grid range can be extended if needed.

### Step 3: For Each (Hs, Tp) Combination

**3a. Wave kinematics at splash zone depth**

Splash zone depth: z = 0 (water surface). Using linear wave theory:

```
Wave angular frequency: ω = 2π / Tp
Wave number: k (from dispersion relation: ω² = g × k × tanh(k × d), solved iteratively)
Wave amplitude: A = Hs / 2

Vertical water velocity:     v_z = A × ω × cosh(k×(d+z)) / sinh(k×d)
Vertical water acceleration: a_z = A × ω² × cosh(k×(d+z)) / sinh(k×d)
Horizontal water velocity:   v_h = A × ω × cosh(k×(d+z)) / sinh(k×d)
```

At z = 0 (surface) and deep water (k×d >> 1): `v_z ≈ A × ω`, `a_z ≈ A × ω²`

**3b. Hydrodynamic forces**

```
Drag force (vertical):
  F_drag = 0.5 × ρ_water × Cd_z × A_z × (v_ct + v_z)²

Inertia force (added mass):
  F_inertia = ρ_water × Ca × V_sub × (a_ct + a_z)

Slamming force:
  F_slam = 0.5 × ρ_water × Cs × A_z × v_slam²
  (v_slam = relative velocity between structure and water at impact)
```

Where:
- `v_ct` = crane tip velocity (derived from crane tip heave amplitude and wave frequency)
- `a_ct` = crane tip acceleration
- `ρ_water` = 1025 kg/m³ (seawater)

**3c. Dynamic Amplification Factor (DAF)**

```
DAF accounts for dynamic effects of the lifting system.
Simplified approach (DNV-ST-N001):

DAF = 1 + (a_ct / g)

Where a_ct = significant crane tip vertical acceleration
```

**3d. Total dynamic hook load**

```
F_total = W_static × DAF + F_drag + F_inertia + F_slam

Where W_static = dry_weight × g (in Newtons)
```

**3e. Feasibility check**

```
Crane capacity at overboard (in Newtons) = crane_capacity_overboard_t × g × 1000

is_feasible = F_total ≤ crane_capacity_overboard (N)
utilization = (F_total / crane_capacity_overboard) × 100%
```

### Step 4: Determine Maximum Hs

Scan the results grid to find the highest Hs where the operation is feasible across all Tp values (or across the relevant Tp range).

```
max_hs = max Hs where ALL Tp columns show is_feasible = true
```

Alternative: find the Hs where utilization first exceeds 100% for any Tp — the max Hs is just below that.

## Running Analysis

### Single Equipment
User selects equipment from dropdown, clicks "Run Analysis":
1. Check prerequisites
2. Calculate hydro coefficients
3. Generate sea state grid
4. Run calculation for each (Hs, Tp)
5. Store results in `splash_zone_result` + `sea_state_limit`
6. Display results

### All Equipment
User clicks "Run All Equipment":
1. Loop through all equipment items with overboard positions
2. Run analysis for each
3. Show progress bar
4. Display summary table at end

## Sea State Operability Table Display

Color-coded grid using Recharts heatmap or custom table:

| Color | Utilization | Meaning |
|-------|------------|---------|
| 🟢 Green | 0 — 70% | Safe, good margin |
| 🟡 Yellow | 70 — 90% | Feasible but limited margin |
| 🔴 Red | > 90% or > 100% | Not feasible or very limited margin |

On hover over a cell: tooltip shows exact utilization %, force breakdown (drag, inertia, slam, DAF contribution).

## Data Saved

### `splash_zone_result` (one per equipment item)
All hydrodynamic coefficients, projected areas, volume, crane tip motions, DAF, max Hs.

### `sea_state_limit` (one per Hs/Tp combination per equipment item)
Hs, Tp, is_feasible, utilization_pct. Typically ~225 rows per equipment item.

## Acceptance Criteria

1. ✅ Hydrodynamic coefficients auto-calculated from equipment geometry type and dimensions
2. ✅ Prerequisites checked before analysis (overboard position, RAOs, crane tip motion)
3. ✅ Calculation runs for all Hs/Tp combinations in the defined grid
4. ✅ Sea state operability table displayed as color-coded grid
5. ✅ Maximum Hs clearly shown for each equipment item
6. ✅ Utilization percentage shown for each cell (hover tooltip)
7. ✅ "Run All Equipment" processes all items with progress indicator
8. ✅ Results persist to Supabase (splash_zone_result + sea_state_limit)
9. ✅ If equipment position changes, old results are invalidated (deleted) and user is prompted to re-run
10. ✅ Calculation does not block UI (web worker for heavy computation)
