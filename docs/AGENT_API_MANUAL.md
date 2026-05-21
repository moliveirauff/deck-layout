# DeckLayout Agent API Manual

This document describes the tools exposed by the Supabase Edge Function `chat` to the DeckLayout AI assistant.

## Runtime

- Edge Function: `supabase/functions/chat/index.ts`
- Model endpoint: Gemini function calling
- Database schema: `deck_layout`
- Required request body:

```json
{
  "projectId": "<uuid>",
  "messages": [{ "role": "user", "content": "Move PLET-A to x=20 y=8" }]
}
```

## Safety rules implemented

- Numeric mutation inputs must be finite numbers.
- Weight and dimensions must be greater than zero.
- Weight/dimension updates refresh derived capacity/deck checks.
- Weight/dimension updates automatically rerun splash-zone analysis when overboard position and crane capacity exist.
- Successful tool calls always produce a fallback assistant response if the model returns empty text.

## Read tools

### `get_project_summary()`
Returns project, vessel and equipment summary with analysis status.

### `get_equipment_details(equipment_name)`
Returns geometry, dimensions, weight, deck position, overboard position and crane status for one equipment item.

### `get_analysis_results(equipment_name)`
Returns persisted splash-zone analysis: max Hs, DAF, operability and hydrodynamic coefficients.

### `get_crane_capacity(equipment_name)`
Returns deck/overboard crane radius, capacity and slew angle.

### `get_sea_state_table(equipment_name)`
Returns Hs/Tp feasibility summary.

### `get_rigging_summary(equipment_name)`
Returns rigging arrangement and WLL-related information.

### `get_seafastening_results(equipment_name)`
Returns saved sea-fastening analysis.

### `get_stability_results()`
Returns saved vessel stability analysis.

### `get_lowering_results(equipment_name)`
Returns saved subsea lowering analysis.

## Mutation tools

### `update_equipment_weight(equipment_name, new_weight_t)`
Updates dry weight in tonnes.

Post-actions:
- refreshes `capacity_check_deck_ok`
- refreshes `capacity_check_overboard_ok`
- refreshes basic `deck_load_ok` when a load zone contains the equipment center
- automatically reruns splash-zone analysis if overboard crane data exists

Example:

```text
Change Manifold M1 - Well A weight to 100 t and show the impact.
```

### `update_equipment_dimensions(equipment_name, length_m, width_m, height_m)`
Updates bounding-box dimensions in metres.

Post-actions are the same as `update_equipment_weight`.

### `move_equipment_on_deck(equipment_name, x, y)`
Moves an equipment item to deck coordinates `(x, y)` in metres.

### `rotate_equipment_on_deck(equipment_name, rotation_deg)`
Rotates an equipment item on the deck. Rotation is normalized to `[0, 360)`.

### `move_equipment_overboard(equipment_name, x, y)`
Sets the overboard/splash-zone target position.

### `update_rigging(equipment_name, rigging_weight_t?, safety_factor?)`
Updates rigging parameters stored on project equipment.

## Calculation tools

### `run_splash_zone_analysis(equipment_name)`
Runs and persists DNV-ST-N001 splash-zone analysis for one equipment item.

### `run_all_analysis()`
Runs splash-zone analysis for all equipment with overboard positions.

### `compare_scenarios(equipment_name, parameter, values)`
Simulates one parameter without saving. Supported parameters:

- `weight`
- `length`
- `width`
- `height`
- `transit_hs`
- `current_speed`
- `rigging_weight`

## Demo prompt examples

```text
List the current equipment on deck and summarize analysis status.
```

```text
Move PLET-A - Well A Prod to x=18 and y=9 on deck.
```

```text
Rotate PLET-B - Well A Gas to 45 degrees.
```

```text
Change Manifold M1 - Well A weight to 100 t and show the impact on DAF and max Hs.
```

```text
Compare Manifold M1 - Well A with weights 50, 75 and 100 tonnes.
```
