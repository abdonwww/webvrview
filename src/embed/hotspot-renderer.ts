import { EventEmitter } from 'eventemitter3';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import Util from "../shared/util";

/**
 * Responsible for rectangular hot spots that the user can interact with.
 *
 * Specific duties:
 *   Adding and removing hotspots.
 *   Rendering the hotspots (debug mode only).
 *   Notifying when hotspots are interacted with.
 *
 * Emits the following events:
 *   click (id): a hotspot is clicked.
 *   focus (id): a hotspot is focused.
 *   blur (id): a hotspot is no longer hovered over.
 */

// Constants for the focus/blur animation.
const NORMAL_SCALE = new THREE.Vector3(1, 1, 1);
const FOCUS_SCALE = new THREE.Vector3(1.2, 1.2, 1.2);
const FOCUS_DURATION = 200;

// Constants for the active/inactive animation.
const INACTIVE_COLOR = new THREE.Color(1, 1, 1);
const ACTIVE_COLOR = new THREE.Color(0.8, 0, 0);
const ACTIVE_DURATION = 100;

// Constants for opacity.
const MAX_INNER_OPACITY = 0.8;
const MAX_OUTER_OPACITY = 0.5;
const FADE_START_ANGLE_DEG = 35;
const FADE_END_ANGLE_DEG = 60;

export default class HotspotRenderer extends EventEmitter {
  worldRenderer: any;
  scene: any;
  hotspotRoot: any;
  hotspots: any;
  selectedHotspots: any;
  downHotspots: any;
  pointer: any;
  raycaster: any;
  tween: any;
  timeForHospotClick: any;

  constructor(worldRenderer: any) {
    super();

    this.worldRenderer = worldRenderer;
    this.scene = worldRenderer.scene;
  
    // Note: this event must be added to document.body and not to window for it to
    // work inside iOS iframes.
    var body = document.body;
    // Bind events for hotspot interaction.
    if (!Util.isMobile()) {
      // Only enable mouse events on desktop.
      body.addEventListener('mousedown', this.onMouseDown_.bind(this), false);
      body.addEventListener('mousemove', this.onMouseMove_.bind(this), false);
      body.addEventListener('mouseup', this.onMouseUp_.bind(this), false);
    }
    body.addEventListener('touchstart', this.onTouchStart_.bind(this), false);
    body.addEventListener('touchend', this.onTouchEnd_.bind(this), false);
  
    // Add a placeholder for hotspots.
    this.hotspotRoot = new THREE.Object3D();
    // Align the center with the center of the camera too.
    this.hotspotRoot.rotation.y = Math.PI / 2;
    this.scene.add(this.hotspotRoot);
  
    // All hotspot IDs.
    this.hotspots = {};
  
    // Currently selected hotspots.
    this.selectedHotspots = {};
  
    // Hotspots that the last touchstart / mousedown event happened for.
    this.downHotspots = {};
  
    // For raycasting. Initialize mouse to be off screen initially.
    this.pointer = new THREE.Vector2(1, 1);
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * @param pitch {Number} The latitude of center, specified in degrees, between
   * -90 and 90, with 0 at the horizon.
   * @param yaw {Number} The longitude of center, specified in degrees, between
   * -180 and 180, with 0 at the image center.
   * @param radius {Number} The radius of the hotspot, specified in meters.
   * @param distance {Number} The distance of the hotspot from camera, specified
   * in meters.
   * @param hotspotId {String} The ID of the hotspot.
   */
  add(pitch: number, yaw: number, radius: number, distance: number, id: string) {
    // If a hotspot already exists with this ID, stop.
    if (this.hotspots[id]) {
      // TODO: Proper error reporting.
      console.error('Attempt to add hotspot with existing id %s.', id);
      return;
    }
    var hotspot = this.createHotspot_(radius, distance);
    hotspot.name = id;
  
    // Position the hotspot based on the pitch and yaw specified.
    var quat = new THREE.Quaternion();
    quat.setFromEuler(new THREE.Euler(THREE.Math.degToRad(pitch), THREE.Math.degToRad(yaw), 0, 'ZYX'));
    hotspot.position.applyQuaternion(quat);
    hotspot.lookAt(new THREE.Vector3());
  
    this.hotspotRoot.add(hotspot);
    this.hotspots[id] = hotspot;
  }

  /**
   * Removes a hotspot based on the ID.
   *
   * @param ID {String} Identifier of the hotspot to be removed.
   */
  remove(id: string) {
    // If there's no hotspot with this ID, fail.
    if (!this.hotspots[id]) {
      // TODO: Proper error reporting.
      console.error('Attempt to remove non-existing hotspot with id %s.', id);
      return;
    }
    // Remove the mesh from the scene.
    this.hotspotRoot.remove(this.hotspots[id]);
  
    // If this hotspot was selected, make sure it gets unselected.
    delete this.selectedHotspots[id];
    delete this.downHotspots[id];
    delete this.hotspots[id];
    this.emit('blur', id);
  }

  /**
   * Clears all hotspots from the pano. Often called when changing panos.
   */
  clearAll() {
    for (var id in this.hotspots) {
      this.remove(id);
    }
  }

  getCount() {
    var count = 0;
    for (var id in this.hotspots) {
      count += 1;
    }
    return count;
  }

  update(camera: any) {
    if (this.worldRenderer.isVRMode()) {
      this.pointer.set(0, 0);
    }
    // Update the picking ray with the camera and mouse position.
    this.raycaster.setFromCamera(this.pointer, camera);
  
    // Fade hotspots out if they are really far from center to avoid overly
    // distorted visuals.
    this.fadeOffCenterHotspots_(camera);
  
    var hotspots = this.hotspotRoot.children;
  
    // Go through all hotspots to see if they are currently selected.
    for (var i = 0; i < hotspots.length; i++) {
      var hotspot = hotspots[i];
      //hotspot.lookAt(camera.position);
      var id = hotspot.name;
      // Check if hotspot is intersected with the picking ray.
      var intersects = this.raycaster.intersectObjects(hotspot.children);
      var isIntersected = (intersects.length > 0);
  
      // If newly selected, emit a focus event.
      if (isIntersected && !this.selectedHotspots[id]) {
        this.emit('focus', id);
        this.focus_(id);
      }
      // If no longer selected, emit a blur event.
      if (!isIntersected && this.selectedHotspots[id]) {
        this.emit('blur', id);
        this.blur_(id);
      }
      // Update the set of selected hotspots.
      if (isIntersected) {
        this.selectedHotspots[id] = true;
      } else {
        delete this.selectedHotspots[id];
      }
    }
  }

  /**
   * Toggle whether or not hotspots are visible.
   */
  setVisibility(isVisible: boolean) {
    this.hotspotRoot.visible = isVisible;
  }

  onTouchStart_(e: TouchEvent) {
    // In VR mode, don't touch the pointer position.
    if (!this.worldRenderer.isVRMode()) {
      this.updateTouch_(e);
    }
  
    // Force a camera update to see if any hotspots were selected.
    this.update(this.worldRenderer.camera);
  
    this.downHotspots = {};
    for (var id in this.selectedHotspots) {
      this.downHotspots[id] = true;
      this.down_(id);
    }
    return false;
  }

  onTouchEnd_(e: TouchEvent) {
    // If no hotspots are pressed, emit an empty click event.
    if (Util.isEmptyObject(this.downHotspots)) {
      this.emit('click');
      return;
    }
  
    // Only emit a click if the finger was down on the same hotspot before.
    for (var id in this.downHotspots) {
      this.emit('click', id);
      this.up_(id);
      e.preventDefault();
    }
  }

  updateTouch_(e: TouchEvent) {
    var size = this.getSize_();
    var touch = e.touches[0];
    this.pointer.x = (touch.clientX / size.width) * 2 - 1;
    this.pointer.y = - (touch.clientY / size.height) * 2 + 1;
  }

  onMouseDown_ (e: MouseEvent) {
    this.updateMouse_(e);
  
    this.downHotspots = {};
    for (var id in this.selectedHotspots) {
      this.downHotspots[id] = true;
      this.down_(id);
    }
  }

  onMouseMove_(e: MouseEvent) {
    this.updateMouse_(e);
  }

  onMouseUp_(e: MouseEvent) {
    this.updateMouse_(e);
  
    // If no hotspots are pressed, emit an empty click event.
    if (Util.isEmptyObject(this.downHotspots)) {
      this.emit('click');
      return;
    }
  
    // Only emit a click if the mouse was down on the same hotspot before.
    for (var id in this.selectedHotspots) {
      if (id in this.downHotspots) {
        this.emit('click', id);
        this.up_(id);
      }
    }
  }

  updateMouse_(e: MouseEvent) {
    const size = this.getSize_();
    this.pointer.x = (e.clientX / size.width) * 2 - 1;
    this.pointer.y = - (e.clientY / size.height) * 2 + 1;
  }

  getSize_() {
    const canvas = this.worldRenderer.renderer.domElement;
    return this.worldRenderer.renderer.getSize();
  }

  createHotspot_(radius: number, distance: number) {
    var innerGeometry = new THREE.CircleGeometry(radius, 32);
  
    var innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, side: THREE.DoubleSide, transparent: true,
      opacity: MAX_INNER_OPACITY, depthTest: false
    });
  
    var inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.name = 'inner';
  
    var outerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, side: THREE.DoubleSide, transparent: true,
      opacity: MAX_OUTER_OPACITY, depthTest: false
    });
    var outerGeometry = new THREE.RingGeometry(radius * 0.85, radius, 32);
    var outer = new THREE.Mesh(outerGeometry, outerMaterial);
    outer.name = 'outer';
  
    // Position at the extreme end of the sphere.
    var hotspot = new THREE.Object3D();
    hotspot.position.z = -distance;
    hotspot.scale.copy(NORMAL_SCALE);
  
    hotspot.add(inner);
    hotspot.add(outer);
  
    return hotspot;
  }

  /**
   * Large aspect ratios tend to cause visually jarring distortions on the sides.
   * Here we fade hotspots out to avoid them.
   */
  fadeOffCenterHotspots_(camera: any) {
    var lookAt = new THREE.Vector3(1, 0, 0);
    lookAt.applyQuaternion(camera.quaternion);
    // Take into account the camera parent too.
    lookAt.applyQuaternion(camera.parent.quaternion);
  
    // Go through each hotspot. Calculate how far off center it is.
    for (var id in this.hotspots) {
      var hotspot = this.hotspots[id];
      var angle = hotspot.position.angleTo(lookAt);
      var angleDeg = THREE.Math.radToDeg(angle);
      var isVisible = angleDeg < 45;
      var opacity;
      if (angleDeg < FADE_START_ANGLE_DEG) {
        opacity = 1;
      } else if (angleDeg > FADE_END_ANGLE_DEG) {
        opacity = 0;
      } else {
        // We are in the case START < angle < END. Linearly interpolate.
        var range = FADE_END_ANGLE_DEG - FADE_START_ANGLE_DEG;
        var value = FADE_END_ANGLE_DEG - angleDeg;
        opacity = value / range;
      }
  
      // Opacity a function of angle. If angle is large, opacity is zero. At some
      // point, ramp opacity down.
      this.setOpacity_(id, opacity);
    }
  }

  focus_(id: string) {
    var hotspot = this.hotspots[id];
  
    // Tween scale of hotspot.
    this.tween = new TWEEN.Tween(hotspot.scale).to(FOCUS_SCALE, FOCUS_DURATION)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    
    if (this.worldRenderer.isVRMode()) {
      this.timeForHospotClick = setTimeout(function () {
        this.emit('click', id);
      }, 1200 )
    }
  }

  blur_(id: string) {
    var hotspot = this.hotspots[id];
  
    this.tween = new TWEEN.Tween(hotspot.scale).to(NORMAL_SCALE, FOCUS_DURATION)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    
    if (this.timeForHospotClick) {
      clearTimeout( this.timeForHospotClick );
    }
  }

  down_(id: string) {
    // Become active.
    var hotspot = this.hotspots[id];
    var outer = hotspot.getObjectByName('inner');
  
    this.tween = new TWEEN.Tween(outer.material.color).to(ACTIVE_COLOR, ACTIVE_DURATION)
        .start();
  }

  up_(id: string) {
    // Become inactive.
    var hotspot = this.hotspots[id];
    var outer = hotspot.getObjectByName('inner');
  
    this.tween = new TWEEN.Tween(outer.material.color).to(INACTIVE_COLOR, ACTIVE_DURATION)
        .start();
  }

  setOpacity_(id: string, opacity: number) {
    var hotspot = this.hotspots[id];
    var outer = hotspot.getObjectByName('outer');
    var inner = hotspot.getObjectByName('inner');
  
    outer.material.opacity = opacity * MAX_OUTER_OPACITY;
    inner.material.opacity = opacity * MAX_INNER_OPACITY;
  }
}
