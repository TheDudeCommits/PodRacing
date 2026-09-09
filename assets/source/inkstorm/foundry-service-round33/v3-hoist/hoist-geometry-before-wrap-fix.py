# Pure arithmetic V3 geometry fragment. Embedded into the isolated MCP author;
# this fragment does not import Blender or run a scene mutation.
def build_service_geometry():
    data = new_geometry()
    x, y = -16, 5.6
    # A forward service monorail sits outside the near truss, carried by the
    # original -31/-15/+1 joint stations. These are real supported outriggers.
    box(data,(-15,y,48.45),(35,2.6,.25),'steel','hoist_track')
    box(data,(-15,y,47.75),(35,.35,1.30),'cobalt','hoist_track')
    box(data,(-15,y,47.0),(35,2.6,.25),'steel','hoist_track')
    for station in [-31,-15,1]:
        box(data,(station,4.39,47.6),(1.8,.27,2.6),'steel','hoist_mounts')
        wedge(data,[(station,4.28,46.30),(station,4.28,48.32),(station,6.65,48.32)],
              (1,0,0),.44,'cobalt','hoist_mounts')
        for z in [46.65,48.30]:
            tube(data,(station,4.2,z),(station,4.67,z),.27,'cream','hoist_mounts',6)
    # Wheels and exposed axles remain distinct from open triangular bearing
    # brackets; the V2 full orange near-side masking rectangle is eliminated.
    wheel_z = 47.125+.5
    for dx in [-2.45,2.45]:
        for sign in [-1,1]:
            tube(data,(x+dx,y+sign*.85-.16,wheel_z),(x+dx,y+sign*.85+.16,wheel_z),.50,'ink','hoist_wheels',8)
            tube(data,(x+dx,y+sign*.52,wheel_z),(x+dx,y+sign*1.27,wheel_z),.23,'cream','hoist_axles',6)
        wedge(data,[(x+dx,4.55,47.7),(x+dx,6.85,47.7),(x+dx,6.75,44.32)],
              (1,0,0),.34,'steel','hoist_bearings')
        for z in [44.70,47.35]:
            tube(data,(x+dx-.24,6.32,z),(x+dx+.24,6.32,z),.29,'cream','hoist_bearings',6)
    # The horizontal drum faces the road through its curved barrel, not a plate.
    # Its barrel bottom44.78 and flange bottom44.68 clears the preserved original near conduit top44.59.
    drum_y, drum_z = 5.85, 45.8
    tube(data,(x-2.1,drum_y,drum_z),(x+2.1,drum_y,drum_z),1.02,'steel','hoist_drum',12)
    for dx in [-2.04,2.04]:
        tube(data,(x+dx-.1,drum_y,drum_z),(x+dx+.1,drum_y,drum_z),1.12,'rust','hoist_drum',12)
    for dx in [-1.50,-.50,.50,1.50]:
        ring(data,(x+dx,drum_y,drum_z),(1,0,0),1.055,1.021,.18,'ink','drum_cable_wrap',8)
    tube(data,(x+2.38,drum_y,drum_z),(x+3.75,drum_y,drum_z),.86,'coral','hoist_motor',12)
    for dx in [2.63,3.29]:
        ring(data,(x+dx,drum_y,drum_z),(1,0,0),.95,.861,.16,'steel','motor_fins',12)
    # Two separated cable legs are attached at the visible lower drum quadrant
    # and meet the lower sheave. Their Y6.2 plane clears the Y5.9 conduit.
    for dx in [-.76,.76]:
        tube(data,(x+dx,6.2,44.84),(x+dx,6.2,42.85),.105,'ink','service_cable',6)
    # Circular guard rims expose the sheave and its axle. There is no solid
    # orange pulley block obscuring the cable route or the hook's throat.
    for yy in [5.80,6.45]:
        ring(data,(x,yy,42.2),(0,1,0),.88,.65,.18,'coral','lower_pulley',12)
    tube(data,(x,5.76,42.2),(x,6.5,42.2),.65,'steel','lower_pulley',12)
    tube(data,(x,5.60,42.2),(x,6.68,42.2),.22,'cream','lower_pulley',6)
    # A broad true open J-hook uses the available height above the invariant
    #39.67 corridor. Its loop is not filled by any backing plate.
    hook=[(x,6.2,41.57),(x,6.2,41.05),(x-.55,6.2,40.73),
          (x-.85,6.2,40.35),(x-.63,6.2,40.0),(x-.05,6.2,39.96),
          (x+.55,6.2,40.22),(x+.62,6.2,40.74)]
    sweep(data,hook,.22,'steel','service_hook',8)
    return data
