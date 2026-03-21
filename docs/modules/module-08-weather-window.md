# Module 08 — Weather Window Analysis

## Objective

Cross-reference the sea state limits from the DNV analysis with metocean scatter diagram data to determine what percentage of time the installation operation is feasible at a given field location.

## User Stories

1. As an engineer, I want to input a wave scatter diagram for the field location.
2. As an engineer, I want to see the operability percentage for each equipment item.
3. As an engineer, I want to see which scatter diagram cells fall within the operational limits.

## Route

```
/#/projects/:id/weather     → Weather Window Analysis
```

## UI Layout

```
┌──────────┬──────────────────────────────────────────────┐
│ PROJECT  │                                               │
│ SIDEBAR  │  Weather Window Analysis                      │
│          │                                               │
│ Overview │  ┌─ Scatter Diagram Input ────────────────┐  │
│ Deck     │  │      Tp(s)→  4   6   8  10  12  14  16 │  │
│ RAO      │  │ Hs(m)↓                                  │  │
│ Analysis │  │  0.50       0.5 1.2 2.0 1.5 0.8 0.3 0.1│  │
│ Weath ◄  │  │  1.00       0.8 3.5 5.2 4.0 2.5 1.0 0.3│  │
│ 3D View  │  │  1.50       0.3 2.8 6.1 5.5 3.8 1.5 0.5│  │
│ Report   │  │  2.00       0.1 1.5 4.2 5.0 4.0 2.0 0.8│  │
│          │  │  2.50        -  0.5 2.5 4.0 3.5 2.5 1.2│  │
│          │  │  3.00        -  0.1 1.0 2.5 3.0 2.0 1.0│  │
│          │  │  3.50        -   -  0.3 1.0 2.0 1.5 0.8│  │
│          │  │  4.00        -   -  0.1 0.5 1.0 0.8 0.5│  │
│          │  │                            Total: 100%   │  │
│          │  │ [Paste from Excel]  [Clear]  [Save]      │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Operability Results ──────────────────┐  │
│          │  │                                         │  │
│          │  │ Equipment        Max Hs  Operability    │  │
│          │  │ ──────────────────────────────────────  │  │
│          │  │ Manifold M1      2.25m   78.5%  🟢     │  │
│          │  │ PLET-A           2.75m   89.2%  🟢     │  │
│          │  │ Template T1      1.50m   45.3%  🟡     │  │
│          │  │                                         │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  ┌─ Overlay View ─────────────────────────┐  │
│          │  │  Equipment: [Manifold M1 ▼]             │  │
│          │  │                                         │  │
│          │  │  Scatter diagram with limit overlay:     │  │
│          │  │  Green cells = feasible + has occurrence │  │
│          │  │  Red cells = infeasible + has occurrence │  │
│          │  │  Gray cells = no occurrence data         │  │
│          │  └─────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

## Scatter Diagram Input

### Table Structure

Editable matrix where:
- Rows = Hs bins (m)
- Columns = Tp bins (s)
- Cell values = occurrence percentage (%)

All cells must sum to approximately 100% (tolerance: 98-102%).

### Input Methods

**Manual entry:** Click cells and type values.

**Paste from Excel:** User selects the scatter diagram matrix in Excel (Hs labels in first column, Tp labels in first row, percentages in cells), copies, and clicks "Paste from Excel". The system:
1. Parses tab-separated clipboard data
2. Extracts Hs values from first column
3. Extracts Tp values from first row
4. Fills cell values
5. Validates total ≈ 100%

**Empty cells:** Interpreted as 0% occurrence. Displayed as "-" for clarity.

### Validation

- All percentage values must be ≥ 0
- Total of all cells: warn if < 98% or > 102%
- Hs values must be positive and monotonically increasing
- Tp values must be positive and monotonically increasing

## Operability Calculation

For each equipment item that has splash zone results:

```
operability_pct = Σ (occurrence_pct for all cells where sea_state_limit.is_feasible = true)
```

### Matching Logic

The scatter diagram bins may not exactly match the sea state analysis grid. The system uses the nearest-neighbor approach:

1. For each scatter diagram cell (Hs_scatter, Tp_scatter):
2. Find the nearest `sea_state_limit` entry by Hs and Tp
3. Use that entry's `is_feasible` flag
4. If no nearby entry exists (scatter bin is outside analysis grid range), assume `is_feasible = false`

### Operability Indicators

| Operability | Color | Meaning |
|------------|-------|---------|
| ≥ 80% | 🟢 Green | Good operability, standard operations |
| 50-80% | 🟡 Yellow | Moderate, may need weather window planning |
| < 50% | 🔴 Red | Poor operability, significant waiting expected |

## Overlay View

When the user selects an equipment item, the scatter diagram is shown with a color overlay:

- **Green cells:** Occurrence > 0 AND sea state is feasible → this time contributes to operability
- **Red cells:** Occurrence > 0 AND sea state is NOT feasible → lost operational time
- **Gray cells:** No occurrence data (0% or not in scatter diagram)
- **Bold border:** The feasibility boundary line separating green from red zones

This gives the engineer an immediate visual understanding of where the operational limit falls relative to the site's wave climate.

## Data Operations

### Save Scatter Diagram
1. Validate total ≈ 100%
2. Delete existing `scatter_diagram_entry` records for this project
3. Insert all cells with occurrence > 0
4. Recalculate operability for all equipment items with splash zone results
5. Save `weather_window_result` for each equipment item

### Recalculate
Operability auto-recalculates when:
- Scatter diagram is saved
- New splash zone analysis results are available

## Acceptance Criteria

1. ✅ User can input scatter diagram as an editable matrix
2. ✅ Paste from Excel works (tab-separated data with Hs/Tp headers)
3. ✅ Total percentage validation (warn if not ~100%)
4. ✅ Operability calculated for each equipment item with splash zone results
5. ✅ Results table shows equipment name, max Hs, operability %, color indicator
6. ✅ Overlay view shows scatter diagram with feasible/infeasible color coding
7. ✅ Scatter diagram data persists to Supabase
8. ✅ Operability auto-recalculates when scatter diagram or analysis results change
