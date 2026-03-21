# SubLift — Seed Data

## Purpose

Mock data to populate the application for development, testing, and demonstration. All values are realistic but fictional — based on typical SURF operations in Brazilian pre-salt fields.

## Vessel 1: Seven Seas

```
name: "Seven Seas"
vessel_type: "PLSV"
description: "Subsea7 PLSV, Brazilian fleet. Main boom crane OMC Huisman."
deck_length_m: 80.0
deck_width_m: 25.0
deck_origin_x: 0
deck_origin_y: 0
crane_type: "OMC"
crane_pedestal_x: 68.0
crane_pedestal_y: 12.5
crane_pedestal_height_m: 15.0
crane_boom_length_m: 40.0
crane_jib_length_m: null
crane_slew_min_deg: 0
crane_slew_max_deg: 360
```

### Barriers — Seven Seas

```
1. name: "Pipe Rack Port"
   x: 5.0, y: 0.0, length: 50.0, width: 3.0, height: 2.5

2. name: "Pipe Rack Starboard"
   x: 5.0, y: 22.0, length: 50.0, width: 3.0, height: 2.5

3. name: "Moonpool"
   x: 30.0, y: 9.0, length: 8.0, width: 7.0, height: 0.5

4. name: "Tensioner Area"
   x: 55.0, y: 3.0, length: 12.0, width: 19.0, height: 3.0

5. name: "A-Frame Base"
   x: 0.0, y: 8.0, length: 4.0, width: 9.0, height: 4.0
```

### Deck Load Zones — Seven Seas

```
1. name: "Forward Deck"
   x: 0.0, y: 3.0, length: 30.0, width: 19.0
   capacity_t_per_m2: 5.0

2. name: "Mid Deck"
   x: 30.0, y: 3.0, length: 25.0, width: 19.0
   capacity_t_per_m2: 10.0

3. name: "Aft Deck"
   x: 55.0, y: 3.0, length: 25.0, width: 19.0
   capacity_t_per_m2: 8.0
```

### Crane Curve — Seven Seas

```
radius_m | capacity_t | boom_angle_deg
---------|------------|---------------
  10.0   |   400.0    |    75.5
  12.0   |   370.0    |    72.5
  14.0   |   340.0    |    69.5
  16.0   |   310.0    |    66.0
  18.0   |   280.0    |    62.0
  20.0   |   250.0    |    60.0
  22.0   |   220.0    |    56.5
  24.0   |   195.0    |    53.0
  26.0   |   170.0    |    49.5
  28.0   |   145.0    |    45.5
  30.0   |   120.0    |    41.5
  32.0   |   100.0    |    36.5
  34.0   |    80.0    |    31.5
  36.0   |    60.0    |    26.0
  38.0   |    45.0    |    19.0
  40.0   |    30.0    |    10.0
```

## Vessel 2: Skandi Búzios

```
name: "Skandi Búzios"
vessel_type: "PLSV"
description: "DOF Subsea PLSV, chartered for pre-salt operations. Knuckle boom crane."
deck_length_m: 90.0
deck_width_m: 28.0
deck_origin_x: 0
deck_origin_y: 0
crane_type: "knuckle_boom"
crane_pedestal_x: 75.0
crane_pedestal_y: 14.0
crane_pedestal_height_m: 18.0
crane_boom_length_m: 35.0
crane_jib_length_m: 20.0
crane_slew_min_deg: 0
crane_slew_max_deg: 360
```

### Barriers — Skandi Búzios

```
1. name: "Pipe Rack Port"
   x: 5.0, y: 0.0, length: 55.0, width: 3.5, height: 2.5

2. name: "Pipe Rack Starboard"
   x: 5.0, y: 24.5, length: 55.0, width: 3.5, height: 2.5

3. name: "Moonpool"
   x: 35.0, y: 10.0, length: 9.0, width: 8.0, height: 0.5

4. name: "Reel Drive Area"
   x: 60.0, y: 4.0, length: 15.0, width: 20.0, height: 4.0
```

### Deck Load Zones — Skandi Búzios

```
1. name: "Forward Deck"
   x: 0.0, y: 3.5, length: 35.0, width: 21.0
   capacity_t_per_m2: 5.0

2. name: "Mid Deck"
   x: 35.0, y: 3.5, length: 25.0, width: 21.0
   capacity_t_per_m2: 10.0

3. name: "Aft Deck"
   x: 60.0, y: 3.5, length: 30.0, width: 21.0
   capacity_t_per_m2: 8.0
```

### Crane Curve — Skandi Búzios

```
radius_m | capacity_t | boom_angle_deg
---------|------------|---------------
  10.0   |   600.0    |    78.0
  13.0   |   540.0    |    74.0
  16.0   |   470.0    |    70.0
  19.0   |   400.0    |    65.0
  22.0   |   340.0    |    60.0
  25.0   |   280.0    |    55.0
  28.0   |   230.0    |    49.0
  31.0   |   185.0    |    43.0
  34.0   |   150.0    |    37.0
  37.0   |   120.0    |    30.0
  40.0   |    95.0    |    23.0
  43.0   |    70.0    |    15.0
  45.0   |    50.0    |     8.0
```

## Equipment Library

```
1. name: "Manifold M1"
   description: "6-slot production manifold, Búzios field"
   geometry_type: "box"
   length_m: 5.0, width_m: 3.0, height_m: 2.5
   dry_weight_t: 25.0
   submerged_volume_m3: null (auto: 37.5)

2. name: "PLET-A"
   description: "Production PLET with hub connection"
   geometry_type: "box"
   length_m: 3.0, width_m: 2.0, height_m: 1.5
   dry_weight_t: 8.0
   submerged_volume_m3: null (auto: 9.0)

3. name: "Template T1"
   description: "Subsea template, 4-well"
   geometry_type: "box"
   length_m: 8.0, width_m: 6.0, height_m: 3.0
   dry_weight_t: 45.0
   submerged_volume_m3: null (auto: 144.0)

4. name: "Jumper Spool"
   description: "Rigid jumper spool, 8-inch bore"
   geometry_type: "cylinder"
   length_m: 12.0, width_m: 0.5, height_m: 0.5
   dry_weight_t: 3.5
   submerged_volume_m3: null (auto: 2.36)

5. name: "PLET-B"
   description: "Gas injection PLET"
   geometry_type: "box"
   length_m: 2.5, width_m: 1.8, height_m: 1.2
   dry_weight_t: 6.0
   submerged_volume_m3: null (auto: 5.4)
```

## Sample Project

```
name: "Búzios PLET Installation Campaign"
description: "Installation of 2 PLETs and 1 manifold at Búzios pre-salt field"
field_name: "Búzios"
water_depth_m: 2100
vessel: Seven Seas
status: "draft"
```

### Equipment Placement

```
1. equipment: Manifold M1
   label: "Manifold M1 - Well A"
   deck_pos_x: 20.0, deck_pos_y: 12.5, deck_rotation_deg: 0
   overboard_pos_x: 75.0, overboard_pos_y: -5.0

2. equipment: PLET-A
   label: "PLET-A - Well A Prod"
   deck_pos_x: 12.0, deck_pos_y: 8.0, deck_rotation_deg: 0
   overboard_pos_x: 72.0, overboard_pos_y: -4.0

3. equipment: PLET-B
   label: "PLET-B - Well A Gas"
   deck_pos_x: 12.0, deck_pos_y: 16.0, deck_rotation_deg: 90
   overboard_pos_x: 72.0, overboard_pos_y: -6.0
```

### RAO Data (Simplified — Beam Seas 270°)

```
wave_direction_deg: 270

period_s | heave_amp | heave_pha | roll_amp | roll_pha | pitch_amp | pitch_pha
---------|-----------|-----------|----------|----------|-----------|----------
   4.0   |   0.02   |     0     |   0.5    |    0     |   0.10    |     0
   5.0   |   0.05   |    10     |   1.2    |   15     |   0.25    |    12
   6.0   |   0.10   |    25     |   2.1    |   30     |   0.50    |    28
   7.0   |   0.20   |    45     |   3.5    |   50     |   0.80    |    42
   8.0   |   0.35   |    65     |   4.8    |   72     |   1.10    |    60
   9.0   |   0.55   |    85     |   5.5    |   88     |   1.30    |    78
  10.0   |   0.70   |   100     |   5.2    |   98     |   1.20    |    90
  11.0   |   0.80   |   115     |   4.5    |  108     |   1.00    |   100
  12.0   |   0.85   |   130     |   3.8    |  120     |   0.80    |   112
  13.0   |   0.82   |   145     |   3.0    |  135     |   0.60    |   125
  14.0   |   0.75   |   160     |   2.5    |  150     |   0.45    |   140
  15.0   |   0.65   |   172     |   2.0    |  162     |   0.35    |   155
  16.0   |   0.55   |   180     |   1.6    |  170     |   0.28    |   165
  18.0   |   0.40   |   185     |   1.0    |  178     |   0.18    |   175
  20.0   |   0.30   |   188     |   0.7    |  182     |   0.12    |   180
```

### Scatter Diagram (Búzios Field — Typical Annual)

```
Hs(m)\Tp(s) |  4   |  6   |  8   | 10   | 12   | 14   | 16   | 18
------------|------|------|------|------|------|------|------|------
   0.50     | 0.5  | 1.5  | 2.0  | 1.5  | 0.8  | 0.3  | 0.1  | 0.0
   1.00     | 0.8  | 3.5  | 5.5  | 4.5  | 2.5  | 1.0  | 0.3  | 0.1
   1.50     | 0.3  | 2.8  | 6.5  | 6.0  | 4.0  | 1.8  | 0.5  | 0.1
   2.00     | 0.1  | 1.5  | 4.5  | 5.5  | 4.5  | 2.2  | 0.8  | 0.2
   2.50     | 0.0  | 0.5  | 2.5  | 4.0  | 3.8  | 2.5  | 1.2  | 0.3
   3.00     | 0.0  | 0.1  | 1.0  | 2.5  | 3.0  | 2.2  | 1.0  | 0.4
   3.50     | 0.0  | 0.0  | 0.3  | 1.2  | 2.0  | 1.5  | 0.8  | 0.3
   4.00     | 0.0  | 0.0  | 0.1  | 0.5  | 1.0  | 1.0  | 0.5  | 0.2
   4.50     | 0.0  | 0.0  | 0.0  | 0.2  | 0.5  | 0.5  | 0.3  | 0.1
   5.00     | 0.0  | 0.0  | 0.0  | 0.1  | 0.2  | 0.3  | 0.2  | 0.1

Total ≈ 100%
```
