# aframe-multitouch-look-controls

This is an AFrame free-look camera controller for touchscreen devices.

This controller only listens to touch events. The gestures are:
* single touch drag for pich and yaw
* two finger drag to dolly left/right and up/down
* pinch to zoom (implemented as dolly)
, not changing the FOV)

The default AFrame camera controlls support touch to yaw, but not the other gestures.

The way I've used this so far is to create a new camera, with just this controller, then use [dans-camera-juggler](https://morandd.github.io/dans-aframe-camera-juggler/) to activate that camera when on mobile.


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
bounded as _x&plusmn;xrange_ and a pair of values means the bounds will be [x-xrange[0] - x+xrange[1]]. 

# Using #

Include in page and attch to a camera. I have been using this component with [dans-camera-juggler](https://morandd.github.io/dans-aframe-camera-juggler/).

See the [Example](https://morandd.github.io/aframe-multitouch-look-controls/example/)

```
<script src="https://morandd.github.io/aframe-multitouch-look-controls/multitouch-look-controls.js"></script>

...
<a-entity camera multitouch-look-controls></a-entity>
```

