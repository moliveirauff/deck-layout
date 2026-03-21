# SubLift — Subsea Lift Planning Tool

## What is SubLift

SubLift is a single-user desktop web application for planning and analyzing subsea equipment installation operations using offshore vessels with crane systems. It enables engineers to design vessel deck layouts, position equipment, configure crane operations, and perform DNV-ST-N001 splash zone passage calculations to determine operational sea state limits (maximum Hs and Tp) for each lift.

The tool covers the full planning workflow: from defining the vessel and its crane, through building a deck layout with multiple equipment items, to running splash zone analyses and generating a PDF report with results, diagrams, and calculated operational envelopes.

## Who Uses It

Subsea installation engineers and rigging/lifting engineers at offshore oil & gas service companies. The primary use case is planning equipment installation campaigns aboard PLSV (Pipe Laying Support Vessel), LCV (Light Construction Vessel), and Heavy Lift vessels operating in the SURF (Subsea Umbilicals, Risers, Flowlines) segment.

## What It Does

### Core Workflow

1. **Register Vessels (Global Library)** — Define vessels that can be reused across multiple projects. For each vessel: deck outline (length × width), physical barriers and obstructions (pipe racks, moonpools, winch areas), deck load capacity zones (t/m²), crane type (OMC or Knuckle Boom), crane pedestal position, boom geometry, and crane capacity curve (load vs. radius). A vessel is configured once and selected when creating a project.

2. **Register Equipment (Global Library)** — Add equipment items to a global library with: name, dimensions (length × width × height), dry weight, geometric shape classification (box or cylinder) for automatic hydrodynamic coefficient estimation, and submerged volume properties. Equipment items are reused across projects.

3. **Create a Project** — Each project represents one installation operation. Select a vessel from the global library and give the project a name, field location, and water depth. A project can include multiple equipment items to be installed.

4. **Build Deck Layout (2D)** — Drag equipment items from the global library onto the vessel deck in a top-down 2D view. Position items within the deck boundaries, respecting barriers. The system validates deck load capacity for each placed item. The crane is visible with its radius arc showing current capacity.

5. **Define Lift Positions (Deck & Overboard)** — For each equipment item, the user configures two crane operation states:

   - **Deck Position (Pick-up):** The user moves the crane boom to the pick-up location over the equipment on deck. The system shows the crane radius, boom angle, and available capacity at that radius. The user validates that the crane capacity exceeds the equipment weight at this position.

   - **Overboard Position (Splash Zone):** The user moves the crane boom to the overboard deployment location (typically over the vessel side or stern). The system shows the crane radius, boom angle, and available capacity at this new radius. This is the position where the equipment will be lowered through the splash zone. The user validates capacity at this position as well.

   The 2D view provides a **position toggle** allowing the user to switch between Deck Position and Overboard Position for each equipment item. When toggling, the crane visually rotates/extends to the selected position, the capacity indicator updates, and the equipment is shown at the corresponding location (on deck or at the overboard point). This allows the engineer to visually verify both configurations before proceeding to analysis.

   The overboard position also defines the crane geometry (radius, boom angle) that feeds into the crane tip motion calculation for the DNV splash zone analysis.

6. **Input Vessel RAOs** — Enter or paste the vessel's Response Amplitude Operators (RAOs) as a table. RAOs are used to calculate crane tip motions for the DNV splash zone analysis.

7. **Run DNV Splash Zone Analysis** — For each equipment item, using the crane geometry from the Overboard Position defined in step 5, the system calculates:
   - Hydrodynamic coefficients (Cd, Ca, Cs) automatically based on equipment geometry (box/cylinder) and dimensions
   - Crane tip motions derived from vessel RAOs and crane geometry
   - Dynamic loads during splash zone passage per DNV-ST-N001
   - Maximum allowable sea state (Hs, Tp combinations) for the lift
   - Output: a sea state operability table for each equipment item

8. **Weather Window Analysis** — Input metocean data (wave scatter diagram for the field/location). The system cross-references the scatter diagram with the calculated sea state limits to estimate operational weather window availability (percentage of time the operation is feasible).

9. **Generate PDF Report** — Produce a complete operation report including: project summary, vessel and crane data, deck layout diagram (2D), equipment list with properties, crane capacity verification at each lift position, DNV calculation summary for each equipment item, sea state limit tables, weather window analysis results, and 3D visualization snapshots.

### 3D Visualization

At any point after setting up the deck layout, the user can switch to a 3D view showing the vessel deck, all positioned equipment, the crane with its current boom configuration, and the lift path from deck to overboard position. This view is for visualization and verification only — all positioning is done in the 2D view.

## What It Does NOT Do (MVP Scope Boundaries)

- **No rigging arrangement** — The system does not model slings, shackles, spreader bars, or rigging weight. The crane hook load is equal to the equipment dry weight.
- **No in-air or subsea lift phases** — Only splash zone passage is calculated per DNV-ST-N001. Lift-off, in-air transit, and subsea lowering phases are out of scope.
- **No wind loads** — Wind forces on equipment during in-air phase are not calculated.
- **No lift sequencing** — Multiple equipment items are analyzed independently. The order of installation is not modeled.
- **No tandem/dual crane lifts** — Only single crane operations are supported.
- **No operational procedures** — The PDF report contains calculations and data only, not step-by-step lift procedures.
- **No multi-user or permissions** — Single user, no authentication, no roles.
- **No data import** — All data (vessel, crane curves, equipment, RAOs, scatter diagrams) is entered manually through the interface.
- **No imperial units** — SI units only (meters, tonnes, seconds, kN).

## Modules

| # | Module | Purpose |
|---|--------|---------|
| 1 | Vessel Library | Global vessel catalog: deck outline, barriers, deck load zones, crane config and curves |
| 2 | Equipment Library | Global equipment catalog with geometry and weight |
| 3 | Project Manager | Create/open projects, select vessel, manage status |
| 4 | Deck Layout 2D | Drag-and-drop positioning of equipment on deck, crane visualization |
| 5 | Crane Interaction | Crane positioning for deck/overboard, capacity verification, position toggle |
| 6 | RAO & Crane Tip Motion | Vessel RAO input and crane tip motion calculation |
| 7 | DNV Splash Zone Calculator | Hydrodynamic loads and sea state limits per DNV-ST-N001 |
| 8 | Weather Window Analysis | Scatter diagram input and operability assessment |
| 9 | 3D Viewer | Three-dimensional visualization of deck, equipment, crane |
| 10 | PDF Report Generator | Complete operation report with diagrams and calculations |

## Technical Standards

- **DNV-ST-N001** — Marine operations and marine warranty (primary reference for splash zone calculations)
- **DNV-RP-N103** — Modelling and analysis of marine operations (supplementary guidance on hydrodynamic coefficients and load calculations)

## Naming Conventions (Domain)

| Term | Meaning |
|------|---------|
| Project | A single installation operation (one vessel, multiple equipment items) |
| Vessel | The installation ship with its deck and crane |
| Deck | The working area of the vessel, viewed top-down |
| Barrier | Physical obstruction on deck (cannot place equipment here) |
| Deck Load Zone | An area of the deck with a defined load capacity (t/m²) |
| Equipment | A subsea structure to be installed (manifold, PLET, template, etc.) |
| Crane Curve | The relationship between crane radius and lifting capacity |
| Pick-up Position | Where the crane hooks the equipment on deck |
| Overboard Position | Where the crane holds the equipment for lowering into the sea |
| Splash Zone | The region near the water surface where wave loads act on the equipment during lowering |
| RAO | Response Amplitude Operator — defines vessel motion response to waves |
| Crane Tip Motion | The movement of the crane hook point, derived from vessel RAOs and crane geometry |
| Scatter Diagram | A table of wave height (Hs) vs. wave period (Tp) with occurrence frequency, representing the metocean climate at a location |
| Weather Window | A continuous period where sea state is within operational limits |
| DAF | Dynamic Amplification Factor — accounts for dynamic loads during lifting |
| Hs | Significant wave height |
| Tp | Peak wave period |
