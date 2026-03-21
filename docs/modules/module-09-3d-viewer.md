# Module 09 — 3D Viewer

## Objective

Provide a 3D visualization of the vessel deck, equipment, and crane for visual verification of the operation setup. The 3D view is read-only — all positioning is done in the 2D layout.

## User Stories

1. As an engineer, I want to see the deck layout in 3D to verify proportions and clearances.
2. As an engineer, I want to see the crane with its boom at the correct angle and position.
3. As an engineer, I want to toggle between deck and overboard positions in 3D.
4. As an engineer, I want to orbit, zoom, and pan the 3D view.
5. As an engineer, I want to see the water surface for splash zone reference.

## Route

```
/#/projects/:id/3d     → 3D Viewer
```

## UI Layout

```
┌──────────┬──────────────────────────────────────────────┐
│ PROJECT  │                                               │
│ SIDEBAR  │          3D VIEWER (Three.js)                 │
│          │                                               │
│ Overview │   ┌───────────────────────────────────┐       │
│ Deck     │   │                                    │       │
│ RAO      │   │   [3D scene with vessel, equip,    │       │
│ Analysis │   │    crane, water surface]            │       │
│ Weather  │   │                                    │       │
│ 3D ◄──  │   │                                    │       │
│ Report   │   │                                    │       │
│          │   │                                    │       │
│          │   └───────────────────────────────────┘       │
│          │                                               │
│          │   View: [● Deck] [Overboard] [Both]           │
│          │   Show: ☑ Barriers  ☑ Load Zones  ☑ Grid      │
│          │         ☑ Crane Arc  ☑ Water  ☑ Labels         │
│          │   Camera: [Perspective] [Top] [Side] [Front]   │
│          │                                               │
│          │   [📷 Capture Screenshot]                      │
└──────────┴──────────────────────────────────────────────┘
```

## 3D Scene Elements

All geometry is generated programmatically from the data model (no imported 3D files).

### Vessel Deck
- **Geometry:** Flat rectangular plane at z = deck height (e.g., z = 10m above waterline, or configurable)
- **Dimensions:** `deck_length_m` × `deck_width_m`
- **Material:** Light gray, slight texture for realism
- **Border:** Raised edges (bulwark) — thin extruded rectangles, ~1.5m high, around deck perimeter
- **Orientation:** X = longitudinal (bow forward), Y = transversal (port left), Z = vertical

### Barriers
- **Geometry:** Extruded boxes at barrier positions
- **Dimensions:** `length_m` × `width_m` × `height_m`
- **Material:** Red semi-transparent (alpha = 0.5) to show what's behind
- **Labels:** Floating text above each barrier with name

### Deck Load Zones
- **Geometry:** Flat rectangles slightly above deck surface (z offset +0.01m to avoid z-fighting)
- **Material:** Blue semi-transparent (alpha = 0.2)
- **Labels:** Capacity value (e.g., "5.0 t/m²") floating above zone

### Equipment Items
- **Box geometry:** `length_m` × `width_m` × `height_m` rectangular prism
- **Cylinder geometry:** Cylinder with radius = `width_m / 2`, length = `length_m`
- **Material:** Green for normal, yellow for warnings, red for failures
- **Position:** At deck position (deck mode) or overboard position (overboard mode)
- **Labels:** Equipment name floating above
- **Selection:** Click to highlight (brighter material + wireframe overlay)

### Crane
- **Pedestal:** Cylinder at `(crane_pedestal_x, crane_pedestal_y)`, height = `crane_pedestal_height_m`, radius = 1.5m
- **Material:** Dark gray/steel

**OMC (single boom):**
- **Boom:** Tapered cylinder from pedestal top to hook point
- **Angle:** Set by `boom_angle` at current position (deck or overboard)
- **Rotation:** Slew angle from the active equipment item

**Knuckle Boom:**
- **Main boom:** Cylinder from pedestal top, at main boom angle
- **Jib:** Cylinder from main boom tip, at jib angle
- **Both rotate with slew angle**

**Hook:** Small sphere at boom tip representing the crane hook
**Cable:** Thin line from boom tip straight down (optional visual)

### Crane Radius Arc
- **Geometry:** Dashed torus or line arc on the deck plane at the current crane radius
- **Shows:** Capacity label at the arc
- **Optional:** Color gradient on arc (green to red as capacity decreases with radius)

### Water Surface
- **Geometry:** Large plane at z = 0 (waterline)
- **Material:** Blue semi-transparent (alpha = 0.3), animated subtle wave effect (optional)
- **Extends:** Well beyond vessel (e.g., 200m × 200m) to provide sea context

### Sky / Environment
- **Background:** Gradient sky (light blue to white)
- **Lighting:** Directional light (sun) + ambient light
- **Shadows:** Equipment and crane cast shadows on deck (optional, may affect performance)

### Grid
- **Floor grid:** Lines every 5m on the deck surface
- **Toggleable**

## View Modes

### Deck Position Mode
- All equipment at their deck positions
- Crane pointed at the selected equipment (or default position if none selected)
- Full deck view

### Overboard Position Mode
- Selected equipment at overboard position (others remain on deck)
- Crane pointed at overboard position
- Water surface visible below the overboard equipment

### Both Positions Mode
- Selected equipment shown as ghost (wireframe) at deck position AND solid at overboard position
- Crane boom shown at overboard position
- Dashed path arc on deck from deck position to overboard position (representing the lift path)

## Camera Controls

| Control | Action |
|---------|--------|
| Left click + drag | Orbit around center |
| Right click + drag | Pan |
| Mouse wheel | Zoom |
| Preset: Perspective | Default 3/4 view |
| Preset: Top | Bird's eye view (matches 2D layout) |
| Preset: Side | Starboard or port view |
| Preset: Front | Bow or stern view |

Using `@react-three/drei` OrbitControls for smooth camera interaction.

## Screenshot Capture

"Capture Screenshot" button:
1. Renders current Three.js view to an image via `renderer.domElement.toDataURL()`
2. Stores the image in memory (for PDF report use)
3. Also offers direct download as PNG

This is used by Module 10 (PDF Report) to include 3D views in the report.

## Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Many equipment items | Use InstancedMesh for identical geometry types |
| Complex crane model | Keep polygon count low — cylinders with 16 segments |
| Water animation | Simple sine-wave vertex shader, disable if slow |
| Shadows | Off by default, toggle on if GPU supports it |
| Scene size | Limit draw distance. Fog at far distance |

## Acceptance Criteria

1. ✅ 3D scene shows vessel deck at correct dimensions
2. ✅ Barriers displayed as semi-transparent red boxes
3. ✅ Equipment items displayed with correct geometry (box/cylinder) and dimensions
4. ✅ Crane displayed with correct pedestal position and boom configuration
5. ✅ Three view modes work: Deck, Overboard, Both
6. ✅ Camera orbit, pan, zoom work smoothly
7. ✅ Camera presets (top, side, front, perspective) work
8. ✅ Water surface visible at waterline level
9. ✅ Toggle controls for barriers, load zones, grid, labels
10. ✅ Screenshot capture works and produces PNG image
11. ✅ Scene loads in < 2 seconds for typical project (< 10 equipment items)
