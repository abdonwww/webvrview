import { EventEmitter } from "eventemitter3";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import WEBVR from "./three.webvr";
import AdaptivePlayer from "./adaptive-player";
// import HotspotRenderer from './hotspot-renderer';
// import ReticleRenderer from "./reticle-renderer";
import SphereRenderer from "./SphereRenderer";
import VideoProxy from "./video-proxy";
import Util from "../shared/util";

// https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content

export default class WorldRenderer extends EventEmitter {
  sphereRenderer: SphereRenderer;
  // reticleRenderer: ReticleRenderer;
  sceneResolve: Function;
  sceneReject: Function;
  videoProxy: VideoProxy;
  vrDisplay: any;
  camera: any;
  scene: any;
  sceneInfo: any;
  player: any;
  renderer: any;

  constructor() {
    super();
    this.init();

    this.sphereRenderer = new SphereRenderer(this.scene);
    // this.reticleRenderer = new ReticleRenderer(this.camera);

    // Get the VR Display as soon as we initialize.
    // navigator.getVRDisplays().then((displays) => {
    //   if (displays.length > 0) {
    //     this.vrDisplay = displays[0];
    //   }
    // });
  }

  render() {
    this.sphereRenderer.render();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * @return {Promise} When the scene is fully loaded.
   */
  setScene(scene: any): Promise<Object> {
    const promise = new Promise((resolve, reject) => {
      this.sceneResolve = resolve;
      this.sceneReject = reject;
    });

    // const params = {
    //   isStereo: scene.isStereo,
    //   loop: scene.loop,
    //   volume: scene.volume,
    //   muted: scene.muted
    // };

    // this.setDefaultYaw(scene.defaultYaw || 0);

    const params = {
      isStereo: false,
      loop: true,
      volume: 10,
      muted: false
    };

    this.sphereRenderer.setPhotosphere("/assets/gallery/taj-mahal.jpg", params);

    // this.sphereRenderer
    //   .setPhotosphere(scene.image, params)
    //   .then(() => {
    //     this.didLoad();
    //   })
    //   .catch(this.didLoadFail.bind(this));

    // this.sceneInfo = scene;

    return promise;
  }

  private init() {
    const container = document.body;
    const aspect = window.innerWidth / window.innerHeight;

    // Add a group for the photosphere.
    const photoGroup = new THREE.Object3D();
    photoGroup.name = "photo";

    // Add a camera and camera dummy
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
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

    container.appendChild(renderer.domElement);
    container.appendChild(WEBVR.createButton(renderer));

    this.camera = camera;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.add(photoGroup);
    this.scene.add(this.camera.parent);
  }
}
