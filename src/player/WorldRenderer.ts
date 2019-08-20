import { EventEmitter } from "eventemitter3";
import * as THREE from "three";
import { DeviceOrientationControls } from 'three/examples/jsm/controls/DeviceOrientationControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import WEBVR from "./three.webvr";
import AdaptivePlayer from "./AdaptivePlayer";
// import HotspotRenderer from './HotspotRenderer';
// import ReticleRenderer from "./ReticleRenderer";
import SphereRenderer from "./SphereRenderer";
import VideoProxy from "./VideoProxy";
import Util from "../shared/util";

// https://threejsfundamentals.org/threejs/lessons/threejs-webvr.html
// https://qiita.com/kingpanda/items/ffd9633c03f9c8230bfe
// https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content
// https://www.pentacreation.com/blog/2018/11/181105.html

export default class WorldRenderer extends EventEmitter {
  sphereRenderer: SphereRenderer;
  // hotspotRenderer: HotspotRenderer;
  // reticleRenderer: ReticleRenderer;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  sphereGroup: THREE.Object3D;
  sceneResolve: Function;
  sceneReject: Function;
  videoProxy: VideoProxy;
  vrDisplay: VRDisplay;
  sceneInfo: any;
  player: AdaptivePlayer;

  constructor() {
    super();
    
    const container = document.body;
    const aspect = window.innerWidth / window.innerHeight;

    // Add a group for the spheres.
    const sphereGroup = new THREE.Object3D();
    sphereGroup.name = "sphereGroup";

    // Add a camera and camera dummy
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
    camera.position.z = -0.00000001, // For PC
    camera.layers.enable(1);
    camera.layers.enable(2);
    camera.name = "camera";

    // Antialiasing disabled to improve performance.
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.vr.enabled = true; // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994

    this.controls = new OrbitControls(camera, renderer.domElement);

    this.sphereGroup = sphereGroup;
    this.camera = camera;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.add(this.sphereGroup);
    this.scene.add(this.camera);

    this.controls.target.set(0, this.camera.position.y, 0);

    // this.controls.target.set(
    //   this.camera.position.x + 0.001,
    //   this.camera.position.y,
    //   this.camera.position.z,
    // );

    container.appendChild(renderer.domElement);
    container.appendChild(WEBVR.createButton(renderer));

    window.addEventListener('resize', this.onResize.bind(this));
    // window.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('vrdisplaypresentchange', this.onVRDisplayPresentChange.bind(this));

    this.sphereRenderer = new SphereRenderer(this.scene);
    // this.reticleRenderer = new ReticleRenderer(this.camera);

    // Get the VR Display as soon as we initialize.
    // Support both WebVR and WebXR APIs.
    if (navigator.xr) {
      navigator.xr.requestDevice().then((device: any) => {
        if (device) {
          device.supportsSession({ immersive: true, exclusive: true }).then(() => {
            this.vrDisplay = device;
            this.renderer.vr.enabled = true;

            // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994
            // const userHeight = this.camera.position.y;
            // this.controls.target.set(0, userHeight, 0);
            // this.sphereGroup.position.set(0, userHeight, 0);
            console.log('xr', this.camera.position);
            this.emit('displayconnected', { vrDisplay: this.vrDisplay });
          });
        }
      }).catch((event: any) => {
        this.emit('displayunconnected', event);
      });
    } else if (navigator.getVRDisplays) {
      navigator.getVRDisplays().then((displays) => {
        if (displays.length > 0) {
          this.vrDisplay = displays[0];
          this.renderer.vr.enabled = true;

          // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994
          // const userHeight = this.camera.position.y;
          // this.controls.target.set(0, userHeight, 0);
          // this.sphereGroup.position.set(0, userHeight, 0);
          console.log('xr', this.camera.position);
          this.emit('displayconnected', { vrDisplay: this.vrDisplay });
        }
      }).catch((event: any) => {
        this.emit('displayunconnected', event);
      });
    } else {
      this.emit('displaynotfound');
    }

  }

  render() {
    const userHeight = this.camera.position.y;

    if (this.videoProxy) {
      this.videoProxy.update();
    }

    this.sphereGroup.position.set(0, userHeight, 0); // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994
    this.sphereRenderer.render();
    // this.controls.target.set(0, userHeight, 0);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isVRMode()) {
      this.vrDisplay.submitFrame();
    }
  }

  /**
   * @return {Promise} When the scene is fully loaded.
   */
  setScene(sceneInfo: any): Promise<Object> {
    const promise = new Promise((resolve, reject) => {
      this.sceneResolve = resolve;
      this.sceneReject = reject;
    });

    this.sceneInfo = sceneInfo;

    const params = {
      isStereo: sceneInfo.isStereo,
      loop: sceneInfo.loop,
      volume: sceneInfo.volume,
      muted: sceneInfo.muted,
    };

    this.setDefaultYaw(sceneInfo.defaultYaw || 0);

    if (sceneInfo.image && !sceneInfo.video) {
      this.sphereRenderer.setPhotosphere(sceneInfo.image, params).then(() => {
        this.sceneDidLoad();
      }).catch((error: any) => {
        this.sceneDidError(error);
      });
    } else if (sceneInfo.video) {
      this.player = new AdaptivePlayer(params);
      this.player.on('load', (videoElement: any, videoType: number) => {
        this.sphereRenderer.setVideosphere(videoElement, videoType, params).then(() => {
          this.sceneDidLoad({ videoElement: videoElement });
          // this.videoProxy.play(); // Autoplay Test
        }).catch((error: any) => {
          this.sceneDidError(error);
        });
      });
      this.player.on('error', (error: any) => {
        this.sceneDidError('Video load error: ' + error);
      });
      this.player.load(sceneInfo.video);
    
      this.videoProxy = new VideoProxy(this.player.video);
    }

    return promise;
  }

  dispose() {
    const eyeLeft = this.scene.getObjectByName('eyeLeft');
    this.disposeEye(eyeLeft);
    const eyeRight = this.scene.getObjectByName('eyeRight');
    this.disposeEye(eyeRight);
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
      this.disposeEye(eyeLeft);
      photo.remove(eyeLeft);
      this.scene.remove(eyeLeft);
    }
  
    if (eyeRight) {
      this.disposeEye(eyeRight);
      photo.remove(eyeRight);
      this.scene.remove(eyeRight);
    }
  }

  isVRMode() {
    return !!this.vrDisplay && this.vrDisplay.isPresenting;
  }

  private disposeEye(eye: any) {
    if (eye) {
      if (eye.material.map) {
        eye.material.map.dispose();
      }
      eye.material.dispose();
      eye.geometry.dispose();
    }
  }

  /**
   * Sets the default yaw.
   * @param {Number} angleRadian The yaw in radians.
   */
  private setDefaultYaw(angleRadian: number) {
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
    // this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRadian;
    this.camera.rotation.y = (Math.PI / 2.0) + angleRadian;
  }

  private sceneDidLoad(event: Object = {}) {
    this.emit('sceneload', event);
    if (this.sceneResolve) {
      this.sceneResolve();
    }
  }

  private sceneDidError(message: any) {
    this.emit('sceneerror', message);
    if (this.sceneReject) {
      this.sceneReject(message);
    }
  }

  private onVRDisplayPresentChange() {
    if (Util.isDebug()) {
      console.log('onVRDisplayPresentChange');
    }

    const isVR = this.isVRMode();
  
    // If the mode changed to VR and there is at least one hotspot, show reticle.
    // const isReticleVisible = isVR && this.hotspotRenderer.getCount() > 0;
    // this.reticleRenderer.setVisibility(isReticleVisible);
  
    // Resize the renderer for good measure.
    this.onResize();
  
    // When exiting VR mode from iOS, make sure we emit back an exit-fullscreen event.
    if (!isVR && Util.isIOS()) {
      Util.sendParentMessage({
        type: 'exit-fullscreen',
      });
    }

    // Emit a mode change event back to any listeners.
    this.emit('modechange', isVR);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( window.innerWidth, window.innerHeight );
  }

  private onContextMenu(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}
