import { EventEmitter } from "eventemitter3";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import WEBVR from "./three.webvr";
import AdaptivePlayer from "./AdaptivePlayer";
// import HotspotRenderer from './hotspot-renderer';
// import ReticleRenderer from "./reticle-renderer";
import SphereRenderer from "./SphereRenderer";
import VideoProxy from "./VideoProxy";
import Util from "../shared/util";

// https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content

export default class WorldRenderer extends EventEmitter {
  sphereRenderer: SphereRenderer;
  // reticleRenderer: ReticleRenderer;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
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
    camera.layers.enable(1);
    camera.layers.enable(2);
    camera.name = "camera";

    const cameraDummy = new THREE.Object3D();
    cameraDummy.name = "cameraDummy";
    cameraDummy.add(camera);

    // Antialiasing disabled to improve performance.
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.vr.enabled = true; // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994

    this.sphereGroup = sphereGroup;
    this.camera = camera;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.add(this.sphereGroup);
    this.scene.add(this.camera.parent);

    container.appendChild(renderer.domElement);
    container.appendChild(WEBVR.createButton(renderer));

    window.addEventListener('resize', this.onResize.bind(this));
    // window.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('vrdisplaypresentchange', this.onVRDisplayPresentChange.bind(this));

    this.sphereRenderer = new SphereRenderer(this.scene);
    // this.reticleRenderer = new ReticleRenderer(this.camera);

    // Get the VR Display as soon as we initialize.
    navigator.getVRDisplays().then((displays) => {
      if (displays.length > 0) {
        this.vrDisplay = displays[0];
      }
    });
  }

  render() {
    if (this.videoProxy) {
      this.videoProxy.update();
    }

    const userHeight = this.camera.position.y;
    this.sphereGroup.position.set(0, userHeight, 0); // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994
    this.sphereRenderer.render();
    this.renderer.render(this.scene, this.camera);

    if (this.isVRMode()) {
      this.vrDisplay.submitFrame();
    }
  }

  /**
   * @return {Promise} When the scene is fully loaded.
   */
  setScene(scene: any): Promise<Object> {
    const promise = new Promise((resolve, reject) => {
      this.sceneResolve = resolve;
      this.sceneReject = reject;
    });

    this.sceneInfo = scene;

    // const params = {
    //   isStereo: scene.isStereo,
    //   loop: scene.loop,
    //   volume: scene.volume,
    //   muted: scene.muted
    // };

    const params = {
      isStereo: false,
      loop: true,
      volume: 1, // 0 - 1
      muted: true, // autoplay throw DOMExeption if muted property is false
    };

    this.setDefaultYaw(scene.defaultYaw || 0);

    // this.sphereRenderer.setPhotosphere("/assets/gallery/taj-mahal.jpg", params).then(() => {
    //   this.didLoad();
    // }).catch((error: any) => {
    //   this.didError(error);
    // });

    this.player = new AdaptivePlayer(params);
    this.player.on('load', (videoElement: any, videoType: number) => {
      this.sphereRenderer.setVideosphere(videoElement, videoType, params).then(() => {
        this.didLoad({ videoElement: videoElement });
        this.videoProxy.play(); // Test
      }).catch((error: any) => {
        this.didError(error);
      });
    });
    // this.player.on('error', (error: any) => {});
    this.player.load("/assets/dash/richoh1_0.mpd");
    // this.player.load("/assets/video/congo_2048.mp4");
    // this.player.load(scene.video);
  
    this.videoProxy = new VideoProxy(this.player.video);

    return promise;
  }

  autopan() {
    const AUTOPAN_DURATION: number = 3000;
    const AUTOPAN_ANGLE: number = 0.4;

    const targetY = this.camera.parent.rotation.y - AUTOPAN_ANGLE;
    new TWEEN.Tween(this.camera.parent.rotation)
        .to({ y: targetY }, AUTOPAN_DURATION)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
  }

  isVRMode() {
    return !!this.vrDisplay && this.vrDisplay.isPresenting;
  }

  /**
   * Sets the default yaw.
   * @param {Number} angleRadian The yaw in radians.
   */
  private setDefaultYaw(angleRadian: number) {
    // Rotate the camera parent to take into account the scene's rotation.
    // By default, it should be at the center of the image.
    // const display = this.controls.getVRDisplay();

    console.log(this.vrDisplay);

    // For desktop, we subtract the current display Y axis
    // const theta = display.theta_ || 0;

    // For devices with orientation we make the current view center
    // if (display.poseSensor_) {
    //   display.poseSensor_.resetPose();
    // }

    // this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRad - theta;
    this.camera.parent.rotation.y = (Math.PI / 2.0) + angleRadian;
  }

  private didLoad(event: Object = {}) {
    this.emit('load', event);
    if (this.sceneResolve) {
      this.sceneResolve();
    }
  }

  private didError(message: any) {
    this.emit('error', message);
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
    // const isReticleVisible = isVR;
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
