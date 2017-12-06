# multitouch-look-controls

This is an AFrame free-look camera controller for touchscreen devices. This controller only listens to touch events, however on desktops and in VR mode it will automatically switch over to a normal AFrame `look-controls`, meaning it will listen to mouse and deviceorientation events. Thus, this controller can be used as a drop-in replacement for look-controls.

The touch gestures are:
* Single touch drag for pich and yaw
* Two finger drag to dolly left/right (perpendicular to look direction) and up/down
* Pinch to zoom (implemented as dolly)

AFrame's default look-controls support touch to yaw, but not the other touch gestures.

# API #

Attribute | Description | Default
--- | --- | ---
enabled | Is the controller enabled or not? | true
allowRotation | Should this controller rotate object | true
createLookControls | Should this controller create look-controls if it is missing on the element | true
invertRotation | Is the rotation direction inverted | false
maxPitch | Maximum pitch up angle, in degrees | 15
minPitch | Maximum pitch down angle, in degrees | -20
xrange | Maximum, or min/max, dolly distance from starting point along X axis | 5
yrange | Maximum, or min/max, dolly distance from starting point along Y axis | -1 1
zrange | Maximum, or min/max, dolly distance from starting point along Z axis | 5

the `[x|y|z]range` can be specified as a single number or as a pair of numbers. A single value means the range is
bounded as _x&plusmn;xrange_, and a pair of values means the bounds will be from x-xrange[0] to x+xrange[1]. 

# Using #

Include in page, then use as a drop-in replacement for look-controls.

You can optionally provide `look-controls` on the camera with specific parameter settings,  e.g. `<a-entity camera multitouch-look-controls look-controls="standing:false"></a-entity>`. If you do not specify any, a  `look-controls` with default settings will be created automatically. This usually works fine.

```
<script src="https://morandd.github.io/aframe-multitouch-look-controls/multitouch-look-controls.js"></script>

...
<a-entity camera multitouch-look-controls></a-entity>
```



