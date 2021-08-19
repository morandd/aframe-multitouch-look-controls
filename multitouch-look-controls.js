"use strict";

/*
* This is a free-look camera controller, designed for phone/tablet usage. It only supports touch gestures.
*
* One finger: pitch and yaw camera
* Two finger drag: dolly camera left/right (orthogonal to current view) or up/down
* Pinch: zoom

* A bounding box and bounded pitch angles prevent the user from getting totally lost
*/

const THREE = AFRAME.THREE;
const clamp = THREE.MathUtils.clamp;
const degToRad = THREE.MathUtils.degToRad;
const radToDeg = THREE.MathUtils.radToDeg;

AFRAME.registerComponent('multitouch-look-controls', {
  dependencies: ['position', 'rotation'],

  schema: {
    enabled: { default: true },
    maxPitch: { type: 'number', default: 15 },
    minPitch: { type: 'number', default: -20 },
    xrange: { type: 'string', default: '5' },
    yrange: { type: 'string', default: '-1 1' },
    zrange: { type: 'string', default: '5' }
  },

  init() {

    // Find the look-controls on this camera, or create if it doesn't exist.
    this.lookControls = null;
    if (this.el.components["look-controls"]) {
      this.lookControls = this.el.components["look-controls"];
    } else {
      this.el.setAttribute('look-controls', '');
      this.lookControls = this.el.components["look-controls"];
    }
    this.lookControls.pause();
    this.removeEventListeners();



    /*
     On desktop mode, just downgrade ourselves to a normal look-control
     */
    if (!AFRAME.utils.device.isMobile()) {
      this.data.enabled = false;
      this.setEnabled(false);
      this.lookControls.play();
      this.pause();


    } else {
      /*
       * On mobile, we behave normally, except we also set up listeners so we morph to/from normal look-controsl on enter-vr/exit-vr event
       */
      const sceneEl = this.el.sceneEl;

      this.data.maxPitchRad = degToRad(this.data.maxPitch);
      this.data.minPitchRad = degToRad(this.data.minPitch);

      this.pitchObject = new THREE.Object3D();
      this.yawObject = new THREE.Object3D();
      this.yawObject.position.y = 10;
      this.yawObject.add(this.pitchObject);

      this.bounds = {};
      this.bounds.x = [-1, 1];
      this.bounds.y = [-1, 1];
      this.bounds.z = [-1, 1];

      this.dollyObject = new THREE.Object3D();

      //this.bindMethods();
      this.setEnabled(this.data.enabled);

      // Attach listeners to pause myself on enter-vr and resume myself on exit-vr
      this.el.sceneEl.addEventListener('enter-vr', this.handleEnterVRMobile.bind(this));
      this.el.sceneEl.addEventListener('exit-vr', this.handleExitVRMobile.bind(this));

    }

  },

  handleEnterVRMobile(e) {
    this.setEnabled(false);
    this.pause();
    // Ocassionally the initial view in VR does not point towards 0,0,0. I am not sure how to change the intial orientation of VR mode.
    this.el.setAttribute('rotation', '0 0 0');
    this.lookControls.play();
  },
  handleExitVRMobile(e) {
    this.setEnabled(true);
    this.lookControls.pause();

    // Resume the orientation we had before entering VR:
    this.el.setAttribute('rotation', '0 0 0'); // undo the rotations from VR mode
    this.updateRotationAndPosition();

    this.play();
  },

  play() {
    this.addEventListeners();
  },

  pause() {
    this.removeEventListeners();
  },



  update(oldData) {
    const data = this.data;

    // Toggle enable/disabled
    if (oldData && data.enabled !== oldData.enabled) {
      this.setEnabled(data.enabled);
    }
    if (!data.enabled) return;


    if (oldData) {
      this.pitchObject.rotation.set(0, 0, 0);
      this.yawObject.rotation.set(0, 0, 0);

      // Update the camera's bounding box
      const x = this.el.object3D.position.x;
      const y = this.el.object3D.position.y;
      const z = this.el.object3D.position.z;
      const [xMin, xMax] = this.data.xrange.split(' ').map(x => +x);
      const [yMin, yMax] = this.data.yrange.split(' ').map(y => +y);
      const [zMin, zMax] = this.data.zrange.split(' ').map(z => +z);
      this.bounds.x = [x + xMin[0], x + (xMax[1] ?? xMin[0])];
      this.bounds.y = [y + yMin[0], y + (yMax[1] ?? xMin[0])];
      this.bounds.z = [z + zMin[0], z + (zMax[1] ?? xMin[0])];
    }

    this.updateRotationAndPosition();
    //this.updatePosition();
  },

  /*
   * setEnabled just turns on the hand grab cursor. 
   */
  setEnabled(enabled) {
    const sceneEl = this.el.sceneEl;

    function enableGrabCursor() {
      sceneEl.canvas.classList.add('a-grab-cursor');
    }
    function disableGrabCursor() {
      sceneEl.canvas.classList.remove('a-grab-cursor');
    }

    if (!sceneEl.canvas) {
      if (enabled) {
        sceneEl.addEventListener('render-target-loaded', enableGrabCursor);
      } else {
        sceneEl.addEventListener('render-target-loaded', disableGrabCursor);
      }
    } else {
      if (enabled) {
        enableGrabCursor();
      } else {
        disableGrabCursor();
      }
    }
  },

  tick(t) {
    if (this.data.enabled) this.update();
  },

  remove() {
    this.pause();
  },

  bindMethods() {
    this.onTouchStart = bind(this.onTouchStart, this);
    this.onTouchMove = bind(this.onTouchMove, this);
    this.onTouchEnd = bind(this.onTouchEnd, this);
  },




  addEventListeners() {
    const sceneEl = this.el.sceneEl;
    const canvasEl = sceneEl.canvas;

    // I think this is a more intuitive order to apply rotations for the look camera
    // It means you first look left or right, then lower your chin. 
    // The default XYZ order means you lower your chin first, then look left or right (like a cow...)
    this.el.object3D.rotation.order = 'YXZ';

    // listen for canvas to load.
    if (!canvasEl) {
      sceneEl.addEventListener('render-target-loaded', this.addEventListeners.bind(this));
      return;
    }

    // Touch events
    canvasEl.addEventListener('touchstart', this.onTouchStart.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this));
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  },




  removeEventListeners() {

    const canvasEl = this.el.sceneEl?.canvas;
    if (!canvasEl) { return; }

    // Touch events
    canvasEl.removeEventListener('touchstart', this.onTouchStart.bind(this));
    canvasEl.removeEventListener('touchmove', this.onTouchMove.bind(this));
    canvasEl.removeEventListener('touchend', this.onTouchEnd.bind(this));

    this.el.object3D.rotation.order = 'XYZ';

  },

  updateRotationAndPosition() {


    const currentRotation = this.el.getAttribute('rotation');
    const currentPosition = this.el.getAttribute('position');
    const deltaRotation = this.calculateDeltaRotation();
    const deltaDolly = this.calculateDeltaDolly();
    const rotation = {
      x: currentRotation.x - deltaRotation.x,
      y: currentRotation.y - deltaRotation.y,
      z: currentRotation.z
    };
    if (deltaRotation.x !== 0 || deltaRotation.y !== 0) {
      this.el.setAttribute('rotation', rotation);
    }

    if (deltaDolly.x !== 0 || deltaDolly.z !== 0) {
      const leftrightAmount = deltaDolly.x;
      const inoutAmount = deltaDolly.z;
      deltaDolly.z = leftrightAmount * Math.cos(degToRad(rotation.y - 90));
      deltaDolly.x = leftrightAmount * Math.sin(degToRad(rotation.y - 90));
      deltaDolly.z -= inoutAmount * Math.cos(degToRad(rotation.y));
      deltaDolly.x -= inoutAmount * Math.sin(degToRad(rotation.y));

      const position = {
        x: currentPosition.x + deltaDolly.x,
        y: currentPosition.y + deltaDolly.y,
        z: currentPosition.z + deltaDolly.z,
      };
      position.x = clamp(position.x, this.bounds.x[0], this.bounds.x[1]);
      position.y = clamp(position.y, this.bounds.y[0], this.bounds.y[1]);
      position.z = clamp(position.z, this.bounds.z[0], this.bounds.z[1]);

      this.el.setAttribute('position', position);
    }

  },

  calculateDeltaRotation() {
    const currentRotationX = radToDeg(this.pitchObject.rotation.x);
    const currentRotationY = radToDeg(this.yawObject.rotation.y);
    let deltaRotation;
    this.previousRotationX = this.previousRotationX || currentRotationX;
    this.previousRotationY = this.previousRotationY || currentRotationY;
    deltaRotation = {
      x: currentRotationX - this.previousRotationX,
      y: currentRotationY - this.previousRotationY
    };
    this.previousRotationX = currentRotationX;
    this.previousRotationY = currentRotationY;
    return deltaRotation;
  },

  calculateDeltaDolly() {
    const currentDollyX = this.dollyObject.position.x;
    const currentDollyY = this.dollyObject.position.y;
    const currentDollyZ = this.dollyObject.position.z;
    let deltaDolly;
    this.previousDollyX = this.previousDollyX || currentDollyX;
    this.previousDollyY = this.previousDollyY || currentDollyY;
    this.previousDollyZ = this.previousDollyZ || currentDollyZ;
    deltaDolly = {
      x: currentDollyX - this.previousDollyX,
      y: currentDollyY - this.previousDollyY,
      z: currentDollyZ - this.previousDollyZ
    };
    this.previousDollyX = currentDollyX;
    this.previousDollyY = currentDollyY;
    this.previousDollyZ = currentDollyZ;
    return deltaDolly;
  },



  onTouchStart(e) {
    if (e.touches.length == 1) {
      this.touchStart = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      };
      this.touchStarted = true;
    } else if (e.touches.length == 2) {
      this.touchStart = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      };
    } else {
      return;
    }
  },

  onTouchMove(e) {

    const canvas = this.el.sceneEl.canvas;

    if (e.touches.length == 1) {

      const deltaY = 2 * Math.PI * (e.touches[0].pageX - this.touchStart.x) / canvas.clientWidth;
      const deltaX = 2 * Math.PI * (e.touches[0].pageY - this.touchStart.y) / canvas.clientHeight;

      this.yawObject.rotation.y -= deltaY * 0.2;
      this.pitchObject.rotation.x -= deltaX * 0.25;
      this.pitchObject.rotation.x = clamp(this.pitchObject.rotation.x, this.data.minPitchRad, this.data.maxPitchRad); // Constrain pitch angles

      if (Math.abs(deltaX) > 1.5 || Math.abs(deltaY) > 1.5) return;

      this.touchStart = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
        dist: undefined
      };
    } else if (e.touches.length == 2) {

      // Handle the dolly motion. We will look at movement of the mid-point between the two touches.
      const px = (e.touches[0].pageX + e.touches[1].pageX) / 2;
      const py = (e.touches[0].pageY + e.touches[1].pageY) / 2;
      const dist = Math.sqrt(
        (e.touches[0].pageX - e.touches[1].pageX) ** 2
        + (e.touches[0].pageY - e.touches[1].pageY) ** 2
      );

      if (!isFinite(this.touchStart.dist)) this.touchStart.dist = dist;

      const minScreenDim = Math.min(canvas.clientWidth, canvas.clientHeight);
      const maxDist = Math.sqrt(minScreenDim ** 2 + minScreenDim ** 2);

      const deltaX = 2 * Math.PI * (px - this.touchStart.x) / canvas.clientWidth;
      const deltaY = 2 * Math.PI * (py - this.touchStart.y) / canvas.clientHeight;
      const deltaDist = 2 * Math.PI * (dist - this.touchStart.dist) / maxDist;

      if (Math.abs(deltaX) > 1.5 || Math.abs(deltaY) > 1.5) return;

      this.dollyObject.position.x += deltaX * 0.5; // This is left-right movement, perpendicular to the camera's current look direction
      this.dollyObject.position.y += deltaY * 0.5; // This is up-down movement, perpendicular to the camera's current look direction
      this.dollyObject.position.z += deltaDist * 0.5;

      
      this.pitchObject.rotation.x = clamp(this.pitchObject.rotation.x, this.data.minPitchRad, this.data.maxPitchRad); // Constrain pitch angles

      this.touchStart = {
        x: px,
        y: py,
        dist: dist
      };



    } else if (e.touches.length > 2) {
      // 3-finger gestures not supported
    } else {
      // No touches?!
      console.warn('Strange to get here but touches.length==0');
    }

  },

  onTouchEnd(e) {
    this.touchStarted = false;

    // this event also fires when we drop from multiple finers down to just 1 finger remaining.
    // In this case, lets' update touchStart to that finger pos, intead of the mipoint between two fingers.
    if (e.touches.length == 1) {
      this.touchStart = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY
      };
      this.touchStarted = true;
    }
  },

});

