import { EventEmitter } from 'eventemitter3';
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import AdaptivePlayer from './adaptive-player';
// import HotspotRenderer from './hotspot-renderer';
import ReticleRenderer from './reticle-renderer';
import SphereRenderer from './sphere-renderer';
import VideoProxy from './video-proxy';
import Util from "../shared/util";

// const WebVRManager = require('webvr-boilerplate');

/**
 * The main WebGL rendering entry point. Manages the scene, camera, VR-related
 * rendering updates. Interacts with the WebVRManager.
 *
 * Coordinates the other renderers: SphereRenderer, HotspotRenderer,
 * ReticleRenderer.
 *
 * Also manages the AdaptivePlayer and VideoProxy.
 *
 * Emits the following events:
 *   load: when the scene is loaded.
 *   error: if there is an error loading the scene.
 *   modechange(Boolean isVR): if the mode (eg. VR, fullscreen, etc) changes.
 */

interface Params {
  hideFullscreenButton: boolean;
}

const AUTOPAN_DURATION = 3000;
const AUTOPAN_ANGLE = 0.4;


export default class WorldRenderer extends EventEmitter {
  sphereRenderer: SphereRenderer;
  // hotspotRenderer: HotspotRenderer;
  reticleRenderer: ReticleRenderer;
  videoProxy: VideoProxy;
  vrDisplay: any;
  // controls: any;
  // effect: any;
  camera: any;
  scene: any;
  sceneInfo: any;
  player: any;
  renderer: any;
  // manager: any;
  sceneResolve: any;
  sceneReject: any;

  constructor(params: Params) {
    super();
    this.init_(params.hideFullscreenButton);

    this.sphereRenderer = new SphereRenderer(this.scene);
    // this.hotspotRenderer = new HotspotRenderer(this);
    // this.hotspotRenderer.on('focus', this.onHotspotFocus_.bind(this));
    // this.hotspotRenderer.on('blur', this.onHotspotBlur_.bind(this));
    this.reticleRenderer = new ReticleRenderer(this.camera);

    // Get the VR Display as soon as we initialize.
    navigator.getVRDisplays().then((displays) => {
      if (displays.length > 0) {
        this.vrDisplay = displays[0];
      }
    });
  }
  
  render(time: number) {
    // this.controls.update();
    TWEEN.update(time);
    // this.effect.render(this.scene, this.camera);
    // this.hotspotRenderer.update(this.camera);
  }

  /**
   * @return {Promise} When the scene is fully loaded.
   */
  setScene(scene: any) {
    const promise = new Promise((resolve, reject) => {
      this.sceneResolve = resolve;
      this.sceneReject = reject;
    });
  
    if (!scene || !scene.isValid()) {
      this.didLoadFail_(scene.errorMessage);
      return;
    }
  
    const params = {
      isStereo: scene.isStereo,
      loop: scene.loop,
      volume: scene.volume,
      muted: scene.muted
    };
  
    this.setDefaultYaw_(scene.defaultYaw || 0);
  
    // Disable VR mode if explicitly disabled, or if we're loading a video on iOS 9 or earlier.
    // if (scene.isVROff || (scene.video && Util.isIOS9OrLess())) {
    //   this.manager.setVRCompatibleOverride(false);
    // }
  
    // Set various callback overrides in iOS.
    // if (Util.isIOS()) {
    //   this.manager.setFullscreenCallback(() => {
    //     Util.sendParentMessage({ type: 'enter-fullscreen' });
    //   });
    //   this.manager.setExitFullscreenCallback(() => {
    //     Util.sendParentMessage({ type: 'exit-fullscreen' });
    //   });
    //   this.manager.setVRCallback(() => {
    //     Util.sendParentMessage({ type: 'enter-vr' });
    //   });
    // }
  
    // If we're dealing with an image, and not a video.
    if (scene.image && !scene.video) {
      if (scene.preview) {
        // First load the preview.
        this.sphereRenderer.setPhotosphere(scene.preview, params).then(() => {
          // As soon as something is loaded, emit the load event to hide the loading progress bar.
          this.didLoad_();
          // Then load the full resolution image.
          this.sphereRenderer.setPhotosphere(scene.image, params);
        }).catch(this.didLoadFail_.bind(this));
      } else {
        // No preview -- go straight to rendering the full image.
        this.sphereRenderer.setPhotosphere(scene.image, params).then(() => {
          this.didLoad_();
        }).catch(this.didLoadFail_.bind(this));
      }
    } else if (scene.video) {
      if (Util.isIE11()) {
        // On IE 11, if an 'image' param is provided, load it instead of showing an error.
        //
        // TODO(smus): Once video textures are supported, remove this fallback.
        if (scene.image) {
          this.sphereRenderer.setPhotosphere(scene.image, params).then(() => {
            this.didLoad_();
          }).catch(this.didLoadFail_.bind(this));
        } else {
          this.didLoadFail_('Video is not supported on IE11.');
        }
      } else {
        this.player = new AdaptivePlayer(params);
        this.player.on('load', (videoElement: any, videoType: number) => {
          this.sphereRenderer.set360Video(videoElement, videoType, params).then(() => {
            this.didLoad_({ videoElement: videoElement });
          }).catch(this.didLoadFail_.bind(this));
        });
        this.player.on('error', (error: any) => {
          this.didLoadFail_('Video load error: ' + error);
        });
        this.player.load(scene.video);
  
        this.videoProxy = new VideoProxy(this.player.video);
      }
    }
  
    this.sceneInfo = scene;
    if (Util.isDebug()) {
      console.log('Loaded scene', scene);
    }
  
    return promise;
  }

  isVRMode() {
    return !!this.vrDisplay && this.vrDisplay.isPresenting;
  }

  submitFrame() {
    if (this.isVRMode()) {
      this.vrDisplay.submitFrame();
    }
  }

  dispose() {
    const eyeLeft = this.scene.getObjectByName('eyeLeft');
    this.disposeEye_(eyeLeft);
    const eyeRight = this.scene.getObjectByName('eyeRight');
    this.disposeEye_(eyeRight);
  }

  destroy() {
    if (this.player) {
      this.player.removeAllListeners();
      this.player.destroy();
      this.player = null;
    }
    const photo = this.scene.getObjectByName('photo');
    const eyeLeft = this.scene.getObjectByName('eyeLeft');
    const eyeRight = this.scene.getObjectByName('eyeRight');
  
    if (eyeLeft) {
      this.disposeEye_(eyeLeft);
      photo.remove(eyeLeft);
      this.scene.remove(eyeLeft);
    }
  
    if (eyeRight) {
      this.disposeEye_(eyeRight);
      photo.remove(eyeRight);
      this.scene.remove(eyeRight);
    }
  }

  disposeEye_(eye: any) {
    if (eye) {
      if (eye.material.map) {
        eye.material.map.dispose();
      }
      eye.material.dispose();
      eye.geometry.dispose();
    }
  }

  didLoad_(event: Object = {}) {
    this.emit('load', event);
    if (this.sceneResolve) {
      this.sceneResolve();
    }
  }

  didLoadFail_(message: string) {
    this.emit('error', message);
    if (this.sceneReject) {
      this.sceneReject(message);
    }
  }

  /**
   * Sets the default yaw.
   * @param {Number} angleRad The yaw in radians.
   */
  setDefaultYaw_(angleRad: number) {
    // Rotate the camera parent to take into account the scene's rotation.
    // By default, it should be at the center of the image.
    // const display = this.controls.getVRDisplay();

    // For desktop, we subtract the current display Y axis
    // const theta = display.theta_ || 0;

    // For devices with orientation we make the current view center
    // if (display.poseSensor_) {
    //   display.poseSensor_.resetPose();
    // }

    // this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad - theta;
    // this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad;
  }

  /**
   * Do the initial camera tween to rotate the camera, giving an indication that
   * there is live content there (on desktop only).
   */
  autopan(duration?: number) {
    console.log(duration);
    const targetY = this.camera.parent.rotation.y - AUTOPAN_ANGLE;
    const tween = new TWEEN.Tween(this.camera.parent.rotation)
        .to({ y: targetY }, AUTOPAN_DURATION)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
  }

  init_(hideFullscreenButton: boolean) {
    const container = document.querySelector('body');
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
    camera.layers.enable(1);
  
    const cameraDummy = new THREE.Object3D();
    cameraDummy.add(camera);
  
    // Antialiasing disabled to improve performance.
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
    });
    renderer.vr.enabled = true;
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
  
    container.appendChild(renderer.domElement);
  
    // const controls = new THREE.VRControls(camera);
    // const effect = new THREE.VREffect(renderer);
  
    // Disable eye separation.
    // effect.scale = 0;
    // effect.setSize(window.innerWidth, window.innerHeight);
  
    // Present submission of frames automatically. This is done manually in submitFrame().
    // effect.autoSubmitFrame = false;
  
    this.camera = camera;
    this.renderer = renderer;
    // this.effect = effect;
    // this.controls = controls;
    // this.manager = new WebVRManager(renderer, effect, { predistorted: false, hideButton: hideFullscreenButton });
  
    this.scene = this.createScene_();
    this.scene.add(this.camera.parent);
  
    // Watch the resize event.
    window.addEventListener('resize', this.onResize_.bind(this));
  
    // Prevent context menu.
    // window.addEventListener('contextmenu', this.onContextMenu_.bind(this));
    window.addEventListener('vrdisplaypresentchange', this.onVRDisplayPresentChange_.bind(this));
  }

  onResize_() {
    // this.effect.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  onVRDisplayPresentChange_(e: Event) {
    console.log(e);
    if (Util.isDebug()) {
      console.log('onVRDisplayPresentChange_');
    }
    const isVR = this.isVRMode();
  
    // If the mode changed to VR and there is at least one hotspot, show reticle.
    const isReticleVisible = isVR;
    // const isReticleVisible = isVR && this.hotspotRenderer.getCount() > 0;
    this.reticleRenderer.setVisibility(isReticleVisible);
  
    // Resize the renderer for good measure.
    this.onResize_();
  
    // Analytics.
    if (window.analytics) {
      window.analytics.logModeChanged(isVR);
    }
  
    // When exiting VR mode from iOS, make sure we emit back an exit-fullscreen event.
    if (!isVR && Util.isIOS()) {
      Util.sendParentMessage({
        type: 'exit-fullscreen',
      });
    }
  
    // Emit a mode change event back to any listeners.
    this.emit('modechange', isVR);
  }

  createScene_() {
    const scene = new THREE.Scene();
  
    // Add a group for the photosphere.
    const photoGroup = new THREE.Object3D();
    photoGroup.name = 'photo';
    scene.add(photoGroup);
  
    return scene;
  }

  onHotspotFocus_(id: string) {
    console.log(id);
    // Set the default cursor to be a pointer.
    this.setCursor_('pointer');
  }

  onHotspotBlur_(id: string) {
    console.log(id);
    // Reset the default cursor to be the default one.
    this.setCursor_('');
  }

  setCursor_(cursor: string) {
    this.renderer.domElement.style.cursor = cursor;
  }

  onContextMenu_(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}
