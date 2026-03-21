# SubLift — Implementation Prompts

## How to Use This File

1. Open Claude Code Web at `claude.ai/code`
2. Connect your GitHub repo (`sublift`)
3. Copy and paste each prompt below, one at a time
4. Wait for Claude Code to finish and create the PR
5. Review the PR on GitHub
6. If OK, merge. If not, ask Claude Code to fix specific issues.
7. Move to the next prompt.

**Important:** Do NOT skip prompts. Do NOT run multiple prompts at once. Each prompt builds on the previous one.

---

## PHASE 1: PROJECT FOUNDATION

### PROMPT 01 — Scaffold

```
Read CLAUDE.md and docs/TECH_STACK.md.

Initialize the project:
1. Create package.json with all dependencies listed in TECH_STACK.md (version pinning)
2. Configure Vite with React and TypeScript
3. Configure Tailwind CSS
4. Configure tsconfig.json with strict mode
5. Configure ESLint and Prettier
6. Configure Vitest
7. Create the folder structure defined in TECH_STACK.md (src/, src/components/, src/stores/, src/lib/, src/lib/calculations/, src/lib/supabase/, src/types/, src/validation/, src/routes/, tests/)
8. Create a minimal App.tsx with React Router (hash mode) and a "SubLift" heading as placeholder
9. Create src/lib/supabase.ts with Supabase client initialization reading from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars
10. Create .env.example with placeholder values
11. Create .github/workflows/deploy.yml for GitHub Actions: install → test → build → deploy to GitHub Pages
12. Create .gitignore (node_modules, dist, .env)

Do not implement any features yet. Just the skeleton that builds and runs.
Verify: npm run dev should show the placeholder heading. npm run build should succeed.
```

### PROMPT 02 — Supabase Schema

```
Read docs/DATA_MODEL.md.

Create SQL migration files in supabase/migrations/ that create all 12 tables defined in DATA_MODEL.md:
1. vessel
2. vessel_barrier
3. deck_load_zone
4. crane_curve_point
5. equipment_library
6. project
7. project_equipment
8. rao_entry
9. splash_zone_result
10. sea_state_limit
11. scatter_diagram_entry
12. weather_window_result

Include:
- All columns with correct types (uuid, text, numeric, boolean, timestamptz, jsonb)
- Primary keys (uuid with gen_random_uuid() default)
- Foreign keys with correct ON DELETE behavior (CASCADE or RESTRICT per DATA_MODEL.md)
- All indexes listed in DATA_MODEL.md
- RLS policies: enable RLS on all tables, create "Allow all access" policy for each
- created_at defaults to now(), updated_at defaults to now() with trigger for auto-update

Create a single migration file: 001_initial_schema.sql

Also create src/types/database.ts with TypeScript types that mirror all 12 tables.
Also create src/validation/schemas.ts with Zod schemas for form validation of the main entities (vessel, equipment, project).
```

### PROMPT 03 — Supabase Service Layer

```
Read docs/DATA_MODEL.md and docs/CONVENTIONS.md.

Create Supabase service functions in src/lib/supabase/:
- vesselService.ts: loadVessels, loadVessel(id), saveVessel, deleteVessel, loadVesselBarriers(vesselId), saveVesselBarriers(vesselId, barriers[]), loadDeckLoadZones(vesselId), saveDeckLoadZones(vesselId, zones[]), loadCraneCurve(vesselId), saveCraneCurve(vesselId, points[])
- equipmentService.ts: loadEquipment, loadEquipmentItem(id), saveEquipment, deleteEquipment
- projectService.ts: loadProjects, loadProject(id), createProject, deleteProject, updateProjectStatus
- projectEquipmentService.ts: loadProjectEquipment(projectId), addEquipmentToProject, updateEquipmentPosition, updateEquipmentOverboard, removeEquipmentFromProject
- raoService.ts: loadRaoEntries(projectId), saveRaoEntries(projectId, entries[])
- analysisService.ts: saveAnalysisResult, loadAnalysisResult(projectEquipmentId), saveSeaStateLimits, loadSeaStateLimits(resultId)
- weatherService.ts: loadScatterDiagram(projectId), saveScatterDiagram(projectId, entries[]), saveWeatherResult, loadWeatherResult(projectEquipmentId)

All functions follow the { data, error } return pattern from docs/CONVENTIONS.md.
All functions use proper TypeScript types from src/types/database.ts.
Use batch inserts where appropriate (barriers, crane curve points, RAO entries, scatter diagram, sea state limits).
```

### PROMPT 04 — Zustand Stores

```
Read docs/ARCHITECTURE.md (State Management Architecture section) and docs/CONVENTIONS.md.

Create all Zustand stores in src/stores/:
- useVesselStore.ts: vessel data, barriers, deck load zones, crane curve. Actions: loadVessel, updateVessel, saveVessel, addBarrier, removeBarrier, addDeckLoadZone, removeDeckLoadZone, setCraneCurve.
- useEquipmentStore.ts: equipment library list. Actions: loadEquipment, addEquipment, updateEquipment, deleteEquipment.
- useProjectStore.ts: current project and project list. Actions: loadProjects, loadProject, createProject, deleteProject.
- useDeckLayoutStore.ts: project equipment list with positions, selected equipment id. Actions: loadProjectEquipment, addToProject, updatePosition, updateRotation, removeFromProject, setSelectedEquipment.
- useCraneStore.ts: crane position state, active toggle (deck/overboard). Actions: setToggle, updateOverboardPosition, calculateCraneData.
- useRaoStore.ts: RAO entries for current project. Actions: loadRaos, saveRaos, clearRaos.
- useAnalysisStore.ts: splash zone results, sea state limits. Actions: loadResults, runAnalysis, clearResults.
- useWeatherStore.ts: scatter diagram entries, weather window results. Actions: loadScatterDiagram, saveScatterDiagram, calculateOperability.
- useUiStore.ts: active panel, active view (2D/3D), sidebar state.

Each store loads from and saves to Supabase via the service functions from Prompt 03.
Follow the store pattern in docs/CONVENTIONS.md.
```

### PROMPT 05 — Routing & Layout Shell

```
Read docs/UI_SPEC.md and docs/ARCHITECTURE.md (Page / Route Structure section).

Implement the routing and layout:
1. Top bar component: SubLift logo (text), nav links [Vessels, Equipment, Projects], persistent across all pages
2. Route structure (hash mode):
   - /#/ → redirect to /#/projects
   - /#/vessels → VesselListPage (placeholder)
   - /#/vessels/new → VesselEditorPage (placeholder)
   - /#/vessels/:id → VesselEditorPage (placeholder)
   - /#/equipment → EquipmentListPage (placeholder)
   - /#/equipment/new → EquipmentEditorPage (placeholder)
   - /#/equipment/:id → EquipmentEditorPage (placeholder)
   - /#/projects → ProjectListPage (placeholder)
   - /#/projects/new → NewProjectPage (placeholder)
   - /#/projects/:id → ProjectWorkspace (shell with sidebar)
   - /#/projects/:id/deck → DeckLayoutPage (placeholder)
   - /#/projects/:id/rao → RaoInputPage (placeholder)
   - /#/projects/:id/analysis → AnalysisPage (placeholder)
   - /#/projects/:id/weather → WeatherPage (placeholder)
   - /#/projects/:id/3d → Viewer3DPage (placeholder)
   - /#/projects/:id/report → ReportPage (placeholder)

3. ProjectWorkspace component: left sidebar (200px) with nav links (Overview, Deck, RAO, Analysis, Weather, 3D, Report) + content area rendering the active sub-route via Outlet.

4. All placeholder pages should show the page name as heading. Style the top bar and sidebar per docs/UI_SPEC.md color palette.

Verify: navigation works, URLs update, sidebar highlights active link.
```

---

## PHASE 2: GLOBAL LIBRARIES

### PROMPT 06 — Vessel Library: List Page

```
Read docs/modules/module-01-vessel-library.md (List Page section) and docs/UI_SPEC.md.

Implement the Vessel List page (/#/vessels):
1. Fetch all vessels from Supabase on page load via useVesselStore
2. Display as cards in a responsive grid (2-3 per row)
3. Each card shows: vessel name, type badge, deck dimensions (L×W), crane type, max crane capacity (from first curve point)
4. "New Vessel" button in top right → navigates to /#/vessels/new
5. Edit button on each card → navigates to /#/vessels/:id
6. Delete button on each card → confirmation dialog → delete via service (block if used in projects, show error)
7. Empty state with message "No vessels registered. Create your first vessel."
8. Loading skeleton while fetching

Use shadcn Card, Button, AlertDialog for confirmation, Badge for vessel type, Skeleton for loading.
```

### PROMPT 07 — Vessel Editor: Deck & Crane Tabs

```
Read docs/modules/module-01-vessel-library.md (Tab 1: Deck and Tab 4: Crane sections).

Implement the Vessel Editor page (/#/vessels/:id and /#/vessels/new):
1. Split layout: left panel (40%) = 2D preview placeholder (gray box for now), right panel (60%) = tabbed form
2. Create 5 tabs using shadcn Tabs: Deck, Barriers, Deck Load Zones, Crane, Crane Curve
3. Implement Tab 1 (Deck): form with fields per module doc — vessel name, type dropdown, description, deck length, deck width. Use react-hook-form + Zod validation.
4. Implement Tab 4 (Crane): form with fields per module doc — crane type dropdown, pedestal X/Y, pedestal height, boom length, jib length (shown only if knuckle_boom selected), slew min/max angles.
5. Save button in top right: validates all tabs, saves to Supabase via vesselService
6. Back button: navigates to /#/vessels
7. If editing existing vessel: load data on mount, populate all form fields
8. If new vessel: empty form, create on first save

Do NOT implement the 2D preview, Barriers tab, Deck Load Zones tab, or Crane Curve tab yet — those come in next prompts. Leave them as placeholder content in their tabs.
```

### PROMPT 08 — Vessel Editor: Barriers & Deck Load Zones Tabs

```
Read docs/modules/module-01-vessel-library.md (Tab 2: Barriers and Tab 3: Deck Load Zones sections).

Implement:
1. Tab 2 (Barriers): 
   - Editable list of barriers. Each barrier: name, X, Y, length, width, height
   - Add Row button adds a new empty barrier row
   - Remove button on each row (with confirmation)
   - Validation: all positions within deck bounds (reference deck_length and deck_width from Tab 1)
   - Save as part of the main Save button (saves all barriers in batch)

2. Tab 3 (Deck Load Zones):
   - Same editable list pattern as barriers
   - Each zone: name, X, Y, length, width, capacity (t/m²)
   - Add Row, Remove, validation within deck bounds

Use a simple table layout with inline editing (input fields inside table cells). No separate edit form — direct manipulation in the table.
```

### PROMPT 09 — Vessel Editor: Crane Curve Tab

```
Read docs/modules/module-01-vessel-library.md (Tab 5: Crane Curve section).

Implement:
1. Editable table: columns = Radius (m), Capacity (t), Boom Angle (°, optional)
2. Add Row button
3. Remove button per row
4. Validation: minimum 2 points, radii must be unique, warn (not block) if capacity is not monotonically decreasing
5. Below the table: Recharts line chart showing the crane curve (X = radius, Y = capacity)
6. Chart updates in real time as user edits table values
7. Sort rows by radius ascending on save

Save as part of the main vessel Save button.
```

### PROMPT 10 — Vessel Editor: 2D Preview

```
Read docs/modules/module-01-vessel-library.md (2D Preview section).

Replace the gray placeholder in the vessel editor left panel with a Konva canvas:
1. Draw the deck outline as a gray filled rectangle with black border
2. Draw barriers as red semi-transparent rectangles with name labels
3. Draw deck load zones as blue semi-transparent rectangles with capacity labels
4. Draw crane pedestal as a black circle
5. Draw crane max radius arc (dashed circle from slew min to slew max at the maximum radius from the crane curve)
6. Draw coordinate axes: X arrow (bow direction), Y arrow (port direction) at origin
7. Draw a light gray grid every 5m
8. Auto-zoom to fit deck with padding
9. Support zoom (mouse wheel) and pan (click+drag on empty space)

The preview must update in real time as user changes any tab (deck dimensions, barriers, load zones, crane position, crane curve).
```

### PROMPT 11 — Equipment Library

```
Read docs/modules/module-02-equipment-library.md.

Implement the full Equipment Library:

1. Equipment List page (/#/equipment):
   - Table with columns: Name, Geometry Type, L(m), W(m), H(m), Weight(t), Actions
   - Search bar (filters by name)
   - Geometry type filter dropdown (All, Box, Cylinder)
   - Sortable columns (click header to sort)
   - New Equipment button → /#/equipment/new
   - Edit and Delete buttons per row (delete blocked if used in projects)

2. Equipment Editor page (/#/equipment/:id and /#/equipment/new):
   - Split layout: left = 3D mini-preview (Three.js), right = form
   - Form fields: name, description, geometry type dropdown, length, width, height, dry weight, submerged volume (optional)
   - Calculated properties panel (read-only): volume, footprint area, deck pressure, projected areas X/Y/Z
   - 3D preview: shows box or cylinder with correct proportions, dimension labels on edges, grid floor, orbit controls, auto-rotate
   - Save button, validation with Zod

Use @react-three/fiber and @react-three/drei for the 3D mini-preview.
```

---

## PHASE 3: PROJECT CORE

### PROMPT 12 — Project Manager

```
Read docs/modules/module-03-project-manager.md.

Implement:

1. Project List page (/#/projects):
   - Cards in grid layout
   - Each card: project name, vessel name, field name, water depth, equipment count, status badge (Draft/Analyzed/Complete), last modified
   - New Project button → /#/projects/new
   - Open button → /#/projects/:id
   - Delete button with confirmation (cascades all data)
   - Empty state message

2. New Project page (/#/projects/new):
   - Form: project name, description, field name, water depth
   - Vessel selector: radio list showing all vessels with name, type, deck size, crane summary
   - Create button → creates project in Supabase, redirects to /#/projects/:id

3. Project Workspace Overview page (/#/projects/:id):
   - Load project and vessel data on mount
   - Update sidebar with project name, vessel name, status
   - Overview content: project info card, vessel summary card, equipment table with per-item status (positioned? deck load ok? crane ok? analyzed?)
```

### PROMPT 13 — Deck Layout 2D: Canvas & Drag-Drop

```
Read docs/modules/module-04-deck-layout-2d.md.

Implement the Deck Layout 2D page (/#/projects/:id/deck):

1. Three-panel layout: project sidebar | Konva canvas | equipment panel (right, 280px)

2. Canvas (Konva):
   - Draw vessel deck (gray rectangle), barriers (red), deck load zones (blue), crane pedestal (black circle), crane max radius arc
   - Use the same drawing logic from the vessel editor 2D preview (reuse components)
   - Draw placed equipment as green rectangles (box) or ellipses (cylinder top-view) with name labels
   - Grid (toggleable, 5m), scale bar, coordinate axes

3. Equipment Panel (right sidebar):
   - Top section: "Available Equipment" — list of all equipment from global library as draggable cards
   - Search filter
   - Bottom section: "On Deck" — list of placed equipment with status indicators

4. Drag and Drop:
   - User drags an equipment card from the right panel onto the canvas
   - On drop: create project_equipment record, place at drop position
   - Equipment on canvas is draggable (click to select, drag to move)
   - Selected equipment shows blue border and position coordinates

5. Canvas controls toolbar below canvas: Zoom +, Zoom -, Fit, Grid toggle, Snap toggle (0.5m)

6. Validation (real-time on every move):
   - Bounds check (equipment within deck outline)
   - Barrier collision
   - Equipment overlap
   - Deck load capacity
   - Show red border + warning icon on failing items

Save positions to Supabase on every drag end.
```

### PROMPT 14 — Crane Interaction

```
Read docs/modules/module-05-crane-interaction.md.

Add crane interaction to the Deck Layout page:

1. When an equipment item is selected on canvas, show the Crane Interaction panel (below canvas or replacing equipment panel):
   - Toggle buttons: [Deck Position] [Overboard Position] [Both]
   - Crane data display: radius, boom angle, capacity at radius, equipment weight, utilization %, status (OK/FAIL)

2. Deck Position (auto-calculated):
   - Calculate crane radius from pedestal to equipment center
   - Interpolate crane curve for capacity at that radius
   - Draw: boom line from pedestal to equipment, radius label, capacity arc
   - Green/red status based on capacity vs weight

3. Overboard Position (user-defined):
   - Extend canvas beyond deck bounds (light blue water area, 20m around deck)
   - User drags equipment to overboard position (or inputs X, Y coordinates)
   - Same calculations and visualization as deck position but at overboard location
   - Save overboard_pos_x/y and all crane_* fields to project_equipment

4. Toggle behavior:
   - Deck mode: equipment at deck position, crane pointed at deck
   - Overboard mode: equipment at overboard position (deck position shown as ghost at 20% opacity), crane pointed at overboard
   - Both mode: ghost at deck + solid at overboard + dashed path arc between them

5. Validation: capacity checks, reach check (radius > max), slew limit check

Implement the crane calculation functions in src/lib/calculations/crane/:
- calculateCraneRadius.ts (with unit test)
- calculateBoomAngle.ts (with unit test)
- interpolateCraneCurve.ts (with unit test)
- calculateSlewAngle.ts (with unit test)
```

---

## PHASE 4: ANALYSIS ENGINE

### PROMPT 15 — RAO Input & Crane Tip Motion

```
Read docs/modules/module-06-rao-crane-tip.md.

Implement the RAO Input page (/#/projects/:id/rao):

1. Wave direction dropdown (predefined: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°)
2. Editable RAO table (TanStack Table):
   - Columns: Period(s), Heave Amp, Heave Phase, Roll Amp, Roll Phase, Pitch Amp, Pitch Phase
   - Add Row button, Remove Row button per row
   - Inline editing
3. Paste from clipboard button: opens dialog, user pastes tab-separated data from Excel, parse and populate table
4. Save button: saves all RAO entries to Supabase (delete existing + batch insert)
5. RAO plots below table (Recharts): three tabs (Heave, Roll, Pitch), X=period, Y=amplitude, one line per wave direction

6. Crane Tip Motion calculation:
   - Implement in src/lib/calculations/motion/craneTipMotion.ts
   - Inputs: RAO entries + crane pedestal position + crane radius/boom angle at overboard
   - Calculate significant crane tip heave and lateral motion
   - Write unit tests with values from SEED_DATA.md RAOs

7. Results panel at bottom: show crane tip heave and lateral per equipment item (only for items with overboard position defined)
8. "Quick Preset" button: generates sample beam seas RAOs from SEED_DATA.md for testing
```

### PROMPT 16 — Hydrodynamic Coefficients Engine

```
Read docs/modules/module-07-dnv-splash-zone.md (Step 1: Hydrodynamic Coefficients section).

Implement the hydrodynamic coefficient calculation functions in src/lib/calculations/hydro/:

1. dragCoefficient.ts:
   - Input: geometry_type ("box" | "cylinder"), dimensions
   - Output: Cd_x, Cd_y, Cd_z
   - Box: Cd = 1.2 for all directions (rectangular prism per DNV-RP-N103 Table B-2)
   - Cylinder: Cd = 1.0 for perpendicular flow, 0.0 for axial flow
   - Write unit tests for both geometry types

2. addedMassCoefficient.ts:
   - Input: geometry_type, dimensions
   - Output: Ca
   - Box: interpolate from L/W and W/H ratios (simplified: Ca = 1.0 for box with L/W ≈ 1-2)
   - Cylinder: Ca = 1.0 for perpendicular flow
   - Write unit tests

3. slammingCoefficient.ts:
   - Input: geometry_type
   - Output: Cs
   - Box: Cs = 5.0 (flat bottom)
   - Cylinder: Cs = π (circular cross-section)
   - Write unit tests

4. projectedAreas.ts:
   - Input: geometry_type, length, width, height
   - Output: area_x, area_y, area_z (m²)
   - Box: A_x = W×H, A_y = L×H, A_z = L×W
   - Cylinder: A_x = D×L, A_y = D×L, A_z = π×(D/2)²
   - Write unit tests

5. constants.ts:
   - SEAWATER_DENSITY = 1025 kg/m³
   - GRAVITY = 9.81 m/s²
```

### PROMPT 17 — DNV Splash Zone Calculator

```
Read docs/modules/module-07-dnv-splash-zone.md (Steps 2-4 and full UI section).

Implement:

1. Calculation functions in src/lib/calculations/dnv/:
   - splashZoneLoads.ts: calculate drag, inertia, and slamming forces for given Hs, Tp, equipment properties, and crane tip motion. Write unit tests.
   - seaStateFeasibility.ts: check if a single (Hs, Tp) combination is feasible given forces and crane capacity. Return { is_feasible, utilization_pct, force_breakdown }. Write unit tests.
   - generateSeaStateGrid.ts: generate the full Hs × Tp grid (0.5-4.0m × 4-18s), evaluate each combination, return array of results. Write unit tests.

2. Dynamic Amplification Factor in src/lib/calculations/motion/dynamicAmplification.ts:
   - DAF = 1 + (crane_tip_acceleration / g). Write unit test.

3. DNV Analysis page (/#/projects/:id/analysis):
   - Equipment selector dropdown at top
   - Input summary card (weight, geometry, crane capacity, crane tip motion)
   - Hydro coefficients card (auto-calculated, read-only)
   - "Run Analysis" button → runs calculation, saves results to Supabase
   - Results card: max Hs, DAF
   - Sea state operability table: color-coded grid (green ≤70%, yellow 70-90%, red >90%)
   - Hover tooltip on each cell showing utilization % and force breakdown
   - "Run All Equipment" button: processes all items, shows progress bar

Run the heavy calculation in a web worker to avoid blocking the UI. Show progress during "Run All".
```

### PROMPT 18 — Weather Window Analysis

```
Read docs/modules/module-08-weather-window.md.

Implement the Weather Window page (/#/projects/:id/weather):

1. Scatter diagram input:
   - Editable matrix table (rows = Hs bins, columns = Tp bins, cells = occurrence %)
   - Paste from Excel button: parses tab-separated data with Hs headers in first column and Tp headers in first row
   - Total validation (warn if not ~100%)
   - Save button: saves to Supabase

2. Operability calculation in src/lib/calculations/weather/operabilityAnalysis.ts:
   - Cross-reference scatter diagram with sea state limits for each equipment item
   - Calculate operability_pct = sum of occurrence where is_feasible
   - Write unit test

3. Results table:
   - Equipment name, max Hs, operability %, color indicator (green ≥80%, yellow 50-80%, red <50%)

4. Overlay view:
   - Equipment selector dropdown
   - Scatter diagram displayed with color overlay: green cells = feasible + has occurrence, red cells = infeasible + has occurrence, gray = no data
   - Bold boundary line between feasible and infeasible zones
```

---

## PHASE 5: VISUALIZATION & OUTPUT

### PROMPT 19 — 3D Viewer

```
Read docs/modules/module-09-3d-viewer.md.

Implement the 3D Viewer page (/#/projects/:id/3d):

1. Full-width Three.js canvas using @react-three/fiber:
   - Deck: flat plane at deck dimensions, light gray material, raised edges (bulwark)
   - Barriers: extruded red semi-transparent boxes at barrier positions
   - Deck load zones: flat blue semi-transparent rectangles slightly above deck
   - Equipment: green boxes or cylinders at their deck positions with dimension-correct geometry
   - Crane pedestal: dark gray cylinder at pedestal position
   - Crane boom: cylinder from pedestal top to hook point (use boom angle from deck or overboard position)
   - Water surface: large blue semi-transparent plane at z=0
   - Grid on deck surface (toggleable)
   - Sky: gradient background (light blue to white)
   - Directional light + ambient light

2. Camera: OrbitControls from @react-three/drei. Preset buttons: Perspective, Top, Side (starboard), Front (bow).

3. View mode toggle: [Deck] [Overboard] [Both]
   - Deck: equipment at deck positions, crane at deck angle
   - Overboard: selected equipment at overboard position, crane at overboard angle
   - Both: ghost at deck + solid at overboard + dashed path

4. Show/hide toggles: Barriers, Load Zones, Grid, Water, Labels

5. Screenshot capture button: captures canvas as PNG, stores in memory for PDF report

All geometry at real scale (1 unit = 1 meter).
```

### PROMPT 20 — PDF Report Generator

```
Read docs/modules/module-10-pdf-report.md.

Implement the PDF Report page (/#/projects/:id/report):

1. Section checkboxes (all on by default):
   - Vessel & Crane Summary
   - Equipment List
   - Deck Layout (2D capture)
   - Crane Capacity Verification
   - DNV Analysis Results
   - Sea State Operability Tables
   - Weather Window Results
   - 3D View

2. "Generate Report" button with progress bar:
   - Step 1: Collect all data from stores
   - Step 2: Capture 2D canvas (Konva stage.toDataURL)
   - Step 3: Capture crane curve chart (html2canvas)
   - Step 4: Capture sea state tables (html2canvas) — one per equipment
   - Step 5: Capture scatter diagram overlay (html2canvas)
   - Step 6: Capture 3D view (Three.js renderer.domElement.toDataURL)
   - Step 7: Assemble PDF with jsPDF

3. PDF content per module-10 spec:
   - Cover page (project name, vessel, field, date)
   - Table of contents
   - Vessel & crane summary with crane curve chart image
   - Equipment list table
   - Deck layout 2D screenshot
   - Per-equipment analysis pages (crane checks, hydro coefficients, crane tip motion, sea state table image)
   - Weather window summary + scatter overlay image
   - 3D view screenshot

4. Page format: A4, consistent margins, headers with page numbers
5. Preview: show generated PDF in an iframe (blob URL)
6. Download button: doc.save('SubLift_Report_ProjectName_Date.pdf')

Gray out checkboxes for sections without data (e.g., weather window if no scatter diagram entered).
```

---

## PHASE 6: SEED DATA & POLISH

### PROMPT 21 — Seed Data

```
Read docs/SEED_DATA.md.

Create a seed data script that can be triggered from the UI:

1. Add a "Load Demo Data" button on the Dashboard (project list page), visible only when there are no vessels and no equipment in the database.

2. When clicked, populate Supabase with all data from SEED_DATA.md:
   - 2 vessels (Seven Seas with 5 barriers + 3 load zones + 16 crane curve points, Skandi Búzios with 4 barriers + 3 load zones + 13 crane curve points)
   - 5 equipment items
   - 1 sample project (Búzios PLET Campaign) with 3 equipment placements, RAO data (beam seas 270°), and scatter diagram

3. After seeding, refresh the page to show the loaded data.

4. Also add a "Reset All Data" button (in a settings area or at the bottom of the dashboard) that deletes everything from all tables. Require double confirmation ("Are you sure?" + "Type DELETE to confirm").
```

### PROMPT 22 — Final Polish

```
Review the entire application:

1. Check all navigation links work correctly
2. Verify save/load works for all entities (vessel, equipment, project, RAO, scatter)
3. Verify the DNV analysis produces reasonable results with the seed data (Manifold M1 should have max Hs around 2-3m)
4. Verify the weather window shows operability percentage
5. Verify the PDF report generates with all sections
6. Add loading skeletons on all pages that fetch data
7. Add toast notifications for all save/delete operations
8. Add proper empty states on all list pages
9. Ensure the app looks clean on a 1920x1080 screen
10. Run npm run lint and fix any issues
11. Run npm run test and ensure all calculation tests pass
12. Run npm run build and ensure production build succeeds

Do not add new features. Only fix issues and polish existing functionality.
```

---

## TROUBLESHOOTING PROMPTS

Use these if something breaks during development:

### FIX: Build Error

```
Run npm run build. Read the error output. Fix all TypeScript and build errors.
Do not change any functionality — only fix compilation issues.
```

### FIX: Test Failure

```
Run npm run test. Read the failing tests. Fix the implementation to make tests pass.
Do not modify the test expectations unless the test itself is wrong.
```

### FIX: Supabase Connection

```
The app is not connecting to Supabase. Check:
1. .env file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
2. src/lib/supabase.ts reads these correctly
3. The Supabase project has the tables created (check if migrations were applied)
4. RLS policies exist and allow access

Log the Supabase error to console and show it in the UI.
```

### FIX: Canvas Not Rendering

```
The 2D Konva canvas is not showing on the deck layout page. Check:
1. Konva Stage has explicit width and height (not 0)
2. The container div has defined dimensions
3. Data is loaded before rendering (check for null vessel data)
4. Console for any Konva errors

Fix the canvas rendering issue.
```

---

## SUMMARY

| Phase | Prompts | What gets built |
|-------|---------|----------------|
| 1. Foundation | 01-05 | Scaffold, schema, services, stores, routing |
| 2. Libraries | 06-11 | Vessel library (full), equipment library (full) |
| 3. Project Core | 12-14 | Project manager, deck layout 2D, crane interaction |
| 4. Analysis | 15-18 | RAO input, hydro coefficients, DNV analysis, weather window |
| 5. Visualization | 19-20 | 3D viewer, PDF report |
| 6. Polish | 21-22 | Seed data, final review |

Total: **22 prompts** + troubleshooting prompts as needed.

Estimated time: 2-4 hours of active work (prompt → review → merge cycles).
