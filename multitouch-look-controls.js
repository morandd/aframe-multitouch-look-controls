

/*
* This is a free-look camera controller, designed for phone/tablet usage. It only supports touch gestures.
*
* One finger: pitch and yaw camera
* Two finger drag: dolly camera left/right (orthogonal to current view) or up/down
* Pinch: zoom

* A bounding box and bounded pitch angles prevent the user from getting totally lost
*/



AFRAME.registerComponent('multitouch-look-controls', {
  dependencies: ['position', 'rotation'],

  schema: {
    enabled: {default: true}, 
    maxPitch: { type: 'number', default: 15},
    minPitch: { type: 'number', default: -20},
    xrange: { type: 'string', default: '5'},
    yrange: { type: 'string', default: '-1 1'},
    zrange: { type: 'string', default: '5'}
  },

  init: function () {

    // Find the look-controls on this camera, or create if it doesn't exist.
    this.lookControls = null;
    if (this.el.components["look-controls"]) {
      this.lookControls = this.el.components["look-controls"];
    } else {
      this.el.setAttribute('look-controls','');
      this.lookControls = this.el.components["look-controls"];
    }
    this.lookControls.pause();
    this.removeEventListeners();



    /*
     On desktop mode, just downgrade ourselves to a normal look-control
     */
    if (!AFRAME.utils.device.isMobile()){
      this.data.enabled = false;
      this.setEnabled(false);
      this.lookControls.play();
      this.pause();


    } else {
      /*
       * On mobile, we behave normally, except we also set up listeners so we morph to/from normal look-controsl on enter-vr/exit-vr event
       */
      var sceneEl = this.el.sceneEl;

      this.data.maxPitchRad = THREE.Math.degToRad( this.data.maxPitch );
      this.data.minPitchRad = THREE.Math.degToRad( this.data.minPitch );

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

  handleEnterVRMobile: function(e) {
    this.setEnabled(false);
    this.pause();
    // Ocassionally the initial view in VR does not point towards 0,0,0. I am not sure how to change the intial orientation of VR mode.
    this.el.setAttribute('rotation','0 0 0');
    this.lookControls.play();
  },
  handleExitVRMobile: function(e){
    this.setEnabled(true);
    this.lookControls.pause();

    // Resume the orientation we had before entering VR:
    this.el.setAttribute('rotation','0 0 0'); // undo the rotations from VR mode
    this.updateRotationAndPosition();

    this.play();
  },

  play: function () {
    this.addEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },



  update: function (oldData) {
    var data = this.data;

    // Toggle enable/disabled
    if (oldData && data.enabled !== oldData.enabled) {
      this.setEnabled(data.enabled);
    }
    if (!data.enabled) return;


    if (oldData) {
      this.pitchObject.rotation.set(0, 0, 0);
      this.yawObject.rotation.set(0, 0, 0);

      // Update the camera's bounding box
      var r1, r2;
      this.bounds.x = this.data.xrange.split(' ');
      if (this.bounds.x.length === 1) {
        r = parseInt(this.data.xrange[0]);
        this.bounds.x = [this.el.object3D.position.x - r, this.el.object3D.position.x + r];
      } else {
        r = this.bounds.x.map( function(x) { return parseInt(x); } );
        this.bounds.x = [this.el.object3D.position.x + r[0], this.el.object3D.position.x + r[1]];
      }
      this.bounds.y = this.data.yrange.split(' ');
      if (this.bounds.y.length === 1) {
        r = parseInt(this.data.yrange[0]);
        this.bounds.y = [this.el.object3D.position.y - r, this.el.object3D.position.y + r];
      } else {
        r = this.bounds.y.map( function(x) { return parseInt(x); } );
        this.bounds.y = [this.el.object3D.position.y + r[0], this.el.object3D.position.y + r[1]];
      }
      this.bounds.z = this.data.zrange.split(' ');
      if (this.bounds.z.length === 1) {
        r = parseInt(this.data.zrange[0]);
        this.bounds.z = [this.el.object3D.position.z - r, this.el.object3D.position.z + r];
      } else {
        r = this.bounds.z.map( function(x) { return parseInt(x); } );
        this.bounds.z = [this.el.object3D.position.z + r[0], this.el.object3D.position.z + r[1]];
      }
    }

    this.updateRotationAndPosition();
    //this.updatePosition();
  },

  /*
   * setEnabled just turns on the hand grab cursor. 
   */
  setEnabled: function (enabled) {
    var sceneEl = this.el.sceneEl;

    function enableGrabCursor () {
      sceneEl.canvas.classList.add('a-grab-cursor');
    }
    function disableGrabCursor () {
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

  tick: function (t) {
    if (this.data.enabled) this.update();
  },

  remove: function () {
    this.pause();
  },

  bindMethods: function () {
    this.onTouchStart = bind(this.onTouchStart, this);
    this.onTouchMove = bind(this.onTouchMove, this);
    this.onTouchEnd = bind(this.onTouchEnd, this);
  },




  addEventListeners: function () {
    var sceneEl = this.el.sceneEl;
    var canvasEl = sceneEl.canvas;

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




  removeEventListeners: function () {

    var sceneEl = this.el.sceneEl;
    var canvasEl = sceneEl && sceneEl.canvas;
    if (!canvasEl) { return; }

    // Touch events
    canvasEl.removeEventListener('touchstart', this.onTouchStart.bind(this));
    canvasEl.removeEventListener('touchmove', this.onTouchMove.bind(this));
    canvasEl.removeEventListener('touchend', this.onTouchEnd.bind(this));

    this.el.object3D.rotation.order = 'XYZ';

  },

  updateRotationAndPosition: function () {


    var currentRotation = this.el.getAttribute('rotation');
    var currentPosition = this.el.getAttribute('position');
    var deltaRotation = this.calculateDeltaRotation();
    var deltaDolly = this.calculateDeltaDolly();
    var rotation = {
        x: currentRotation.x - deltaRotation.x,
        y: currentRotation.y - deltaRotation.y,
        z: currentRotation.z
      };
    if (deltaRotation.x!==0 || deltaRotation.y !== 0) {
      this.el.setAttribute('rotation', rotation);
    }

    if (deltaDolly.x!==0 || deltaDolly.z !== 0) {
      var leftrightAmount = deltaDolly.x;
      var inoutAmount = deltaDolly.z;
      deltaDolly.z = leftrightAmount * Math.cos(  THREE.Math.degToRad( rotation.y -90 ));
      deltaDolly.x = leftrightAmount * Math.sin(  THREE.Math.degToRad( rotation.y -90 ));
      deltaDolly.z -= inoutAmount * Math.cos(  THREE.Math.degToRad( rotation.y ));
      deltaDolly.x -= inoutAmount * Math.sin(  THREE.Math.degToRad( rotation.y ));

      var position = {
        x: currentPosition.x + deltaDolly.x,
        y: currentPosition.y + deltaDolly.y,
        z: currentPosition.z + deltaDolly.z,
      };

      position.x = Math.max(this.bounds.x[0], Math.min(this.bounds.x[1], position.x )  );
      position.y = Math.max(this.bounds.y[0], Math.min(this.bounds.y[1], position.y )  );
      position.z = Math.max(this.bounds.z[0], Math.min(this.bounds.z[1], position.z )  );

      this.el.setAttribute('position', position);
    }

  },

  calculateDeltaRotation: function () {
    var currentRotationX = THREE.Math.radToDeg(this.pitchObject.rotation.x);
    var currentRotationY = THREE.Math.radToDeg(this.yawObject.rotation.y);
    var deltaRotation;
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

  calculateDeltaDolly: function () {
    var currentDollyX = this.dollyObject.position.x;
    var currentDollyY = this.dollyObject.position.y;
    var currentDollyZ = this.dollyObject.position.z;
    var deltaDolly;
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



  onTouchStart: function (e) {
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

  onTouchMove: function (e) {

    if (e.touches.length == 1 ) {

      var deltaY = 2 * Math.PI * (e.touches[0].pageX - this.touchStart.x) / this.el.sceneEl.canvas.clientWidth;
      var deltaX = 2 * Math.PI * (e.touches[0].pageY - this.touchStart.y) / this.el.sceneEl.canvas.clientHeight;

      this.yawObject.rotation.y -= deltaY * 0.2;
      this.pitchObject.rotation.x -= deltaX * 0.25;
      this.pitchObject.rotation.x = Math.min(this.data.maxPitchRad, Math.max(this.data.minPitchRad, this.pitchObject.rotation.x)); // Constrain pitch angles

      if (Math.abs(deltaX)>1.5 || Math.abs(deltaX)>1.5) return;

      this.touchStart = {
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
        dist: NaN
      };
    } else if (e.touches.length == 2 ) {

      // Handle the dolly motion. We will look at movement of the mid-point between the two touches.
      var px = (e.touches[0].pageX + e.touches[1].pageX) / 2;
      var py = (e.touches[0].pageY + e.touches[1].pageY) / 2;
      var dist = Math.sqrt(  (e.touches[0].pageX - e.touches[1].pageX) * (e.touches[0].pageX - e.touches[1].pageX) +
        (e.touches[0].pageY - e.touches[1].pageY) * (e.touches[0].pageY - e.touches[1].pageY));

      if (!isFinite(this.touchStart.dist)) this.touchStart.dist = dist;

      var minScreenDim = Math.min(this.el.sceneEl.canvas.clientWidth, this.el.sceneEl.canvas.clientHeight );
      var maxDist = Math.sqrt( minScreenDim*minScreenDim + minScreenDim*minScreenDim);

      var deltaX = 2 * Math.PI * (px - this.touchStart.x) / this.el.sceneEl.canvas.clientWidth;
      var deltaY = 2 * Math.PI * (py - this.touchStart.y) / this.el.sceneEl.canvas.clientHeight;
      var deltaDist =   2 * Math.PI * (dist - this.touchStart.dist) / maxDist;

      if (Math.abs(deltaX)>1.5 || Math.abs(deltaX)>1.5) return;

      this.dollyObject.position.x += deltaX * 0.5; // This is left-right movement, perpendicular to the camera's current look direction
      this.dollyObject.position.y += deltaY * 0.5; // This is up-down movement, perpendicular to the camera's current look direction
      this.dollyObject.position.z += deltaDist * 0.5;


      this.pitchObject.rotation.x = Math.min(this.data.maxPitchRad, Math.max(this.data.minPitchRad, this.pitchObject.rotation.x)); // Constrain pitch angles

      this.touchStart = {
        x: px,
        y: py,
        dist: dist
      };



    } else if (e.touches.length > 2 ) {
      // 3-finger gestures not supported
    } else {
      // No touches?!
      console.warn('Strange to get here but touches.length==0');
    }

  },

  onTouchEnd: function (e) {
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

