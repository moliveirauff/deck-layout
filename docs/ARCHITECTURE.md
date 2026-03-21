# SubLift — Architecture

## System Architecture

SubLift is a client-side SPA with a thin data persistence layer. There is no application server.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   React Application                    │   │
│  │                                                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              │   │
│  │  │  Pages   │  │ Stores  │  │  Hooks  │              │   │
│  │  │ (Routes) │  │(Zustand)│  │         │              │   │
│  │  └────┬─────┘  └────┬────┘  └────┬────┘              │   │
│  │       │              │            │                    │   │
│  │  ┌────▼──────────────▼────────────▼────┐              │   │
│  │  │           Component Layer            │              │   │
│  │  │                                      │              │   │
│  │  │  vessel/  equipment/  deck-layout/   │              │   │
│  │  │  crane/   analysis/   viewer-3d/     │              │   │
│  │  │  report/  project/    ui/            │              │   │
│  │  └────┬──────────────────────┬──────────┘              │   │
│  │       │                      │                         │   │
│  │  ┌────▼──────────┐   ┌──────▼──────────┐              │   │
│  │  │  Calculation   │   │   Rendering     │              │   │
│  │  │  Engine        │   │   Engine        │              │   │
│  │  │                │   │                 │              │   │
│  │  │  • DNV splash  │   │  • Konva (2D)   │              │   │
│  │  │  • Crane curves│   │  • Three.js (3D)│              │   │
│  │  │  • Hydro coeff │   │  • jsPDF (PDF)  │              │   │
│  │  │  • RAO/motion  │   │  • Recharts     │              │   │
│  │  │  • Weather win │   │                 │              │   │
│  │  └───────────────┘   └─────────────────┘              │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │ HTTPS (Supabase JS Client)
                               ▼
                    ┌─────────────────────┐
                    │  Supabase (Cloud)    │
                    │                     │
                    │  PostgreSQL database │
                    │  REST API (auto)    │
                    │  RLS policies       │
                    └─────────────────────┘
```

## Module Map

10 modules organized into 3 layers: **Libraries** (global data), **Project Workspace** (where work happens), and **Analysis & Output** (calculations and results).

```
LIBRARIES (global, reusable)
├── M1: Vessel Library ............. CRUD for vessels, barriers, deck load zones, crane curves
└── M2: Equipment Library ......... CRUD for subsea equipment catalog

PROJECT WORKSPACE (per-project)
├── M3: Project Manager ........... Create/open/delete projects, select vessel, status
├── M4: Deck Layout 2D ........... Drag-drop equipment on deck (Konva canvas)
├── M5: Crane Interaction ........ Position crane for deck/overboard, toggle, capacity check
└── M6: RAO & Crane Tip Motion ... RAO table input, crane tip motion calculation

ANALYSIS & OUTPUT
├── M7: DNV Splash Zone .......... Hydrodynamic calcs, sea state limits per DNV-ST-N001
├── M8: Weather Window ........... Scatter diagram input, operability percentage
├── M9: 3D Viewer ................ Three.js visualization of deck + equipment + crane
└── M10: PDF Report .............. Generate complete operation report
```

## Module Dependencies

```
M1 (Vessel Library)
 └──→ M3 (Project Manager) uses vessel_id
       └──→ M4 (Deck Layout 2D) reads vessel deck, barriers, deck load zones
             └──→ M5 (Crane Interaction) reads crane config, equipment positions
                   └──→ M6 (RAO & Crane Tip) uses crane geometry from overboard position
                         └──→ M7 (DNV Splash Zone) uses crane tip motion + equipment hydro
                               └──→ M8 (Weather Window) uses sea state limits from M7

M2 (Equipment Library)
 └──→ M4 (Deck Layout 2D) user selects equipment to place on deck

M9 (3D Viewer) reads from: M1 (vessel), M4 (equipment positions), M5 (crane positions)
M10 (PDF Report) reads from: ALL modules (compiles everything into report)
```

## Data Flow

### Flow 1: Vessel Setup

```
User creates vessel in M1
  → Draws deck outline (length × width)
  → Adds barriers (rectangles on deck)
  → Defines deck load zones (rectangles with t/m² capacity)
  → Configures crane (type, pedestal position, boom length)
  → Inputs crane curve points (radius vs. capacity table)
  → All saved to Supabase: vessel, vessel_barrier, deck_load_zone, crane_curve_point
```

### Flow 2: Project Creation & Deck Layout

```
User creates project in M3
  → Selects vessel from library
  → Project created in Supabase with vessel_id
  
User opens deck layout (M4)
  → System loads vessel deck, barriers, deck load zones from Supabase
  → User drags equipment from library sidebar onto deck
  → For each placed item:
      → System checks: equipment footprint inside deck bounds? → UI indicator
      → System checks: equipment overlaps barrier? → UI indicator
      → System checks: equipment weight / footprint ≤ deck load zone capacity? → UI indicator
  → Positions saved to Supabase: project_equipment (deck_pos_x, deck_pos_y, deck_rotation_deg)
```

### Flow 3: Crane Positioning & Capacity Check

```
User selects an equipment item on deck (M5)
  → System calculates crane radius from pedestal to equipment center
  → System interpolates crane curve → shows capacity at that radius
  → UI shows: crane radius, boom angle, capacity, weight, utilization %
  → capacity_check_deck_ok = (capacity ≥ weight)

User toggles to Overboard Position (M5)
  → User moves equipment to overboard position (drag or coordinate input)
  → System recalculates crane radius for overboard position
  → System interpolates crane curve → shows capacity at new radius
  → UI shows same indicators for overboard position
  → capacity_check_overboard_ok = (capacity ≥ weight)

Both positions saved to Supabase: project_equipment (all crane_* and overboard_* fields)
```

### Flow 4: RAO Input & Crane Tip Motion

```
User inputs RAO table (M6)
  → Table: wave_direction × wave_period → heave, roll, pitch (amplitude + phase)
  → Saved to Supabase: rao_entry (one row per direction/period combination)

System calculates crane tip motion (M6, automatic when RAOs are complete)
  → Inputs: RAOs + crane pedestal position + crane boom length + boom angle at overboard position
  → Calculation:
      1. For each wave direction and period:
         a. Vessel heave at crane pedestal = heave RAO
         b. Vessel roll contribution = roll RAO × pedestal distance from centerline
         c. Vessel pitch contribution = pitch RAO × pedestal distance from midship
         d. Crane tip vertical motion = vessel motion at pedestal + boom tip amplification
         e. Crane tip lateral motion = roll-induced lateral displacement at boom tip
      2. Combine across wave directions (worst case or spectral combination)
  → Output: significant crane tip heave (m) and lateral displacement (m)
  → These feed into M7
```

### Flow 5: DNV Splash Zone Analysis

```
User triggers analysis for an equipment item (M7)
  → Inputs (auto-gathered):
      • Equipment geometry (from equipment_library via project_equipment)
      • Crane tip motion (from M6)
      • Crane capacity at overboard position (from M5)
  
  → Step 1: Calculate hydrodynamic coefficients
      • Based on geometry_type ("box" or "cylinder") and dimensions
      • Cd (drag), Ca (added mass), Cs (slamming) per DNV-RP-N103
      • Projected areas in X, Y, Z from dimensions

  → Step 2: For each Hs/Tp combination in analysis grid:
      a. Calculate wave kinematics (velocity, acceleration) at splash zone depth
      b. Calculate drag force: F_drag = 0.5 × ρ × Cd × A × v²
      c. Calculate inertia force: F_inertia = ρ × Ca × V × a
      d. Calculate slamming force: F_slam = 0.5 × ρ × Cs × A_slam × v_slam²
      e. Calculate DAF from crane tip motion and equipment dynamics
      f. Total dynamic load = static_weight × DAF + hydrodynamic_forces
      g. Check: total_load ≤ crane_capacity_overboard?
      h. Calculate utilization: total_load / crane_capacity × 100%

  → Step 3: Determine maximum Hs
      • Find highest Hs where all Tp values are feasible
      • Or find the Hs/Tp boundary curve

  → Results saved to Supabase: splash_zone_result + sea_state_limit (one row per Hs/Tp)
```

### Flow 6: Weather Window Analysis

```
User inputs scatter diagram (M8)
  → Table: Hs bins × Tp bins → occurrence percentage
  → Saved to Supabase: scatter_diagram_entry

System calculates operability (M8)
  → For each scatter diagram cell:
      • Look up corresponding sea_state_limit for this equipment
      • If is_feasible = true → this cell contributes to operability
  → operability_pct = sum of occurrence_pct for all feasible cells
  → Saved to Supabase: weather_window_result
```

### Flow 7: 3D Visualization

```
User opens 3D view (M9)
  → System reads:
      • Vessel deck geometry (length, width) → flat plane with bulwark edges
      • Barriers → extruded boxes at barrier positions
      • Equipment items → boxes or cylinders at deck positions (from current toggle state)
      • Crane → parametric model: pedestal cylinder + boom arm(s) at current angle
      • Sea surface → semi-transparent plane at z=0
  → All geometry is generated programmatically at real scale (1 unit = 1 meter)
  → User can orbit camera, zoom, pan
  → Toggle deck/overboard position changes crane and equipment positions in real time
```

### Flow 8: PDF Report Generation

```
User triggers report (M10)
  → System compiles:
      1. Project header (name, field, water depth, vessel, date)
      2. Vessel summary (deck dimensions, crane type, crane curve chart)
      3. Equipment list (table with all items, dimensions, weights)
      4. Deck layout capture (html2canvas snapshot of 2D Konva canvas)
      5. For each equipment item:
         a. Crane capacity check (deck + overboard positions, utilization)
         b. Hydrodynamic coefficients used
         c. Crane tip motion summary
         d. DNV splash zone results
         e. Sea state limit table (Hs × Tp grid, color-coded feasible/infeasible)
      6. Weather window summary (operability % per equipment item)
      7. 3D view snapshot (html2canvas of Three.js renderer)
  → Assembled into PDF via jsPDF
  → Offered as download to user
```

## State Management Architecture

Zustand stores manage client-side state. Each major domain has its own store.

```
stores/
├── useVesselStore.ts ......... Active vessel data (deck, barriers, crane, curves)
├── useEquipmentStore.ts ...... Equipment library items
├── useProjectStore.ts ........ Current project metadata, status
├── useDeckLayoutStore.ts ..... Equipment positions on deck, selection state
├── useCraneStore.ts .......... Crane position, angle, active toggle (deck/overboard)
├── useRaoStore.ts ............ RAO entries for current project
├── useAnalysisStore.ts ....... Splash zone results, sea state limits
├── useWeatherStore.ts ........ Scatter diagram, weather window results
└── useUiStore.ts ............. UI state: active panel, 2D/3D view, selected equipment
```

### Store Data Flow Pattern

All stores follow the same pattern:

```
Supabase (source of truth)
    ↕ load / save
Zustand store (working copy in memory)
    ↕ read / update
React components (render + user interaction)
```

1. On page load: fetch from Supabase → populate Zustand store
2. User interacts: update Zustand store → re-render components
3. On save: write Zustand store → Supabase
4. Calculations read from Zustand stores (not Supabase) for instant response

## Calculation Engine Architecture

All calculations live in `src/lib/calculations/` as pure functions. No side effects, no state, no Supabase calls. This makes them testable in isolation.

```
lib/calculations/
├── crane/
│   ├── interpolateCraneCurve.ts .... Linear interpolation of radius → capacity
│   ├── calculateCraneRadius.ts ..... Distance from pedestal to target point
│   └── calculateBoomAngle.ts ....... Boom angle from radius and boom length
├── hydro/
│   ├── dragCoefficient.ts .......... Cd for box/cylinder per DNV-RP-N103
│   ├── addedMassCoefficient.ts ..... Ca for box/cylinder per DNV-RP-N103
│   ├── slammingCoefficient.ts ...... Cs for box/cylinder per DNV-RP-N103
│   └── projectedAreas.ts .......... Projected areas from dimensions
├── motion/
│   ├── craneTipMotion.ts ........... Crane tip displacement from RAOs + geometry
│   └── dynamicAmplification.ts ..... DAF calculation
├── dnv/
│   ├── splashZoneLoads.ts .......... Force calculations per DNV-ST-N001
│   ├── seaStateFeasibility.ts ...... Check single Hs/Tp combination
│   └── generateSeaStateGrid.ts ..... Generate full Hs × Tp operability table
└── weather/
    └── operabilityAnalysis.ts ...... Cross-reference limits with scatter diagram
```

### Calculation Dependencies

```
crane/interpolateCraneCurve
crane/calculateCraneRadius
crane/calculateBoomAngle
         │
         ▼
hydro/dragCoefficient ────────┐
hydro/addedMassCoefficient ───┤
hydro/slammingCoefficient ────┤
hydro/projectedAreas ─────────┤
                               ▼
motion/craneTipMotion ───→ dnv/splashZoneLoads
motion/dynamicAmplification ──→ dnv/seaStateFeasibility
                                      │
                                      ▼
                              dnv/generateSeaStateGrid
                                      │
                                      ▼
                              weather/operabilityAnalysis
```

## Page / Route Structure

```
/#/                          → Dashboard (project list, quick actions)
/#/vessels                   → Vessel Library (list + CRUD)
/#/vessels/:id               → Vessel Editor (deck, barriers, crane, curves)
/#/equipment                 → Equipment Library (list + CRUD)
/#/projects                  → Project List
/#/projects/:id              → Project Workspace (main working area)
/#/projects/:id/deck         → Deck Layout 2D + Crane Interaction
/#/projects/:id/rao          → RAO Input
/#/projects/:id/analysis     → DNV Splash Zone Analysis + Results
/#/projects/:id/weather      → Weather Window Analysis
/#/projects/:id/3d           → 3D Viewer
/#/projects/:id/report       → PDF Report Preview + Download
```

The Project Workspace (`/#/projects/:id`) acts as a shell with a sidebar navigation allowing the user to switch between deck, rao, analysis, weather, 3d, and report sub-pages without leaving the project context.

## Error Handling Strategy

| Layer | Approach |
|-------|----------|
| Supabase calls | Try/catch with toast notifications. Retry once on network error. Show inline error if data fails to load |
| Calculations | Validate inputs with Zod before calculating. Return error objects (not throw) with descriptive messages. Show in UI next to the result |
| Canvas (2D/3D) | Wrap in React error boundaries. Show fallback message if canvas fails to render |
| PDF generation | Try/catch with progress indicator. If capture fails, generate report without images and notify user |

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Large RAO tables (600+ rows) | TanStack Table with virtualization. Batch Supabase writes (insert all rows in one call) |
| Sea state grid calculation (200+ Hs/Tp combinations) | Run in web worker to avoid blocking UI. Show progress bar |
| 3D rendering performance | Use instanced meshes for multiple equipment items. Limit polygon count on crane model. LOD (level of detail) if needed |
| 2D canvas with many items | Konva layer caching. Only redraw changed layers |
| PDF generation with canvas captures | Sequential capture (2D first, then 3D). Show progress indicator. Allow partial report if 3D capture fails |
