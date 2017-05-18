# multitouch-look-controls

This is an AFrame free-look camera controller for touchscreen devices. It will automatically switch over to a normal AFrame `look-controls` on desktop an in VR/HMD mode, and thus can be used as a drop-in replacement for look-controls.

The touch gestures are:
* Single touch drag for pich and yaw
* Two finger drag to dolly left/right (perpendicular to look direction) and up/down
* Pinch to zoom (implemented as dolly)

The default AFrame camera controls support touch to yaw, but not the other gestures.

On desktop and in VR mode (between `enter-vr` and `exit-vr` events) this controls pauses itself and switches to a look-controls on the current camera. This means it listens for mouse input and deviceorientation events. 

# API #

Attribute | Description | Default
--- | --- | ---
enabled | Is the controller enabled or not? | true
maxPitch | Maximum pitch up angle, in degrees | 15
minPitch | Maximum pitch down angle, in degrees | -20
xrange | Maximum, or min/max, dolly distance from starting point along X axis | 5
yrange | Maximum, or min/max, dolly distance from starting point along Y axis | -1 1
zrange | Maximum, or min/max, dolly distance from starting point along Z axis | 5

the `[x|y|z]range` can be specified as a single number or as a pair of numbers. A single value means the range is
bounded as _x&plusmn;xrange_, and a pair of values means the bounds will be [x-xrange[0] - x+xrange[1]]. 

# Using #

Include in page, then use as a drop-in replacement for look-controls.

You can optionally provide `look-controls` on the camera with specific parameter settings. If none is provided a new `look-controls` with default settings will be created automatically. This usually works fine.

```
<script src="https://morandd.github.io/aframe-multitouch-look-controls/multitouch-look-controls.js"></script>

...
<a-entity camera multitouch-look-controls></a-entity>
```

You can also explicitly set your own look-controls parameters, e.g. `<a-entity camera multitouch-look-controls look-controls="standing:false"></a-entity>`




