import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import Util from "../shared/util";
import { VIDEO_TYPE, EYE } from "../shared/constants";

export default class SphereRenderer {
  scene: THREE.Scene;
  camera: THREE.Object3D;
  sphereGroup: THREE.Object3D;
  opacityMask: THREE.Mesh;
  src: string;
  isStereo: boolean;
  resolve: Function;
  reject: Function;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.camera = this.scene.getObjectByName("camera");
    this.sphereGroup = this.scene.getObjectByName("sphereGroup");
    this.opacityMask = this.createOpacityMask();
    this.scene.add(this.opacityMask);
  }

  render() {
    const userHeight = this.camera.position.y;
    this.opacityMask.position.set(0, userHeight, 0);
  }

  /**
   * Sets the photosphere based on the image in the source. Supports stereo and mono photospheres.
   */
  setPhotosphere(src: string, params: any = {}): Promise<void> {
    return new Promise((resolve: Function, reject: Function) => {
      this.resolve = resolve;
      this.reject = reject;
      this.isStereo = !!params.isStereo;
      this.src = src;

      // Load texture.
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      loader.load(
        src,
        this.onTextureLoaded.bind(this),
        undefined,
        this.onTextureError.bind(this)
      );
    });
  }

  /**
   * @return {Promise} Yeah.
   */
  setVideosphere(videoElement: any, videoType: number, opt_params: any) {
    return new Promise((resolve: Function, reject: Function) => {
      this.resolve = resolve;
      this.reject = reject;

      var params = opt_params || {};

      this.isStereo = !!params.isStereo;

      // Load the video texture.
      const videoTexture = new THREE.VideoTexture(videoElement);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.generateMipmaps = false;

      if (Util.isSafari() && videoType === VIDEO_TYPE.HLS) {
        // fix black screen issue on safari
        videoTexture.format = THREE.RGBAFormat;
        videoTexture.flipY = false;
      } else {
        videoTexture.format = THREE.RGBFormat;
      }

      videoTexture.needsUpdate = true;

      this.onTextureLoaded(videoTexture);
    });
  }

  /**
   * Set the opacity of the panorama.
   *
   * @param {Number} opacity How opaque we want the panorama to be. 0 means black, 1 means full color.
   * @param {Number} duration Number of milliseconds the transition should take.
   *
   * @return {Promise} When the opacity change is complete.
   */
  setOpacity(opacity: number, duration: number) {
    const scene = this.scene;
    // If we want the opacity
    const overlayOpacity = 1 - opacity;
    return new Promise((resolve: any) => {
      const mask = scene.getObjectByName("mask") as THREE.Mesh;
      const material = (mask.material instanceof THREE.Material) ? mask.material : mask.material[0];
      const tween = new TWEEN.Tween({ opacity: material.opacity })
        .to({ opacity: overlayOpacity }, duration)
        .easing(TWEEN.Easing.Quadratic.InOut);
      tween.onUpdate(function() {
        material.opacity = this.opacity;
      });
      tween.onComplete(resolve).start();
    });
  }

  /**
   * OpacityMask: Sphere for fading in and out
   */
  private createOpacityMask() {
    const geometry = new THREE.SphereGeometry(0.49, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      opacity: 0,
      transparent: true,
    });
    const opacityMask = new THREE.Mesh(geometry, material);
    opacityMask.name = "opacityMask";
    opacityMask.renderOrder = 1;

    return opacityMask;
  }

  private createPhotosphere(texture: any, opt_params: any = {}) {
    const params = Object.assign({
      scaleX: 1,
      scaleY: 1,
      offsetX: 0,
      offsetY: 0,
      phiStart: 0,
      phiLength: Math.PI * 2,
      thetaStart: 0,
      thetaLength: Math.PI,
    }, opt_params);

    const geometry = new THREE.SphereGeometry(
      1,
      48,
      48,
      params.phiStart,
      params.phiLength,
      params.thetaStart,
      params.thetaLength
    );
    geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

    const uvs = geometry.faceVertexUvs[0];
    for (var i = 0; i < uvs.length; i++) {
      for (var j = 0; j < 3; j++) {
        uvs[i][j].x *= params.scaleX;
        uvs[i][j].x += params.offsetX;
        uvs[i][j].y *= params.scaleY;
        uvs[i][j].y += params.offsetY;
      }
    }

    let material;
    if (texture.format === THREE.RGBAFormat && texture.flipY === false) {
      material = new THREE.ShaderMaterial({
        uniforms: {
          texture: { value: texture }
        },
        vertexShader: [
          "varying vec2 vUV;",
          "void main() {",
          "	vUV = vec2( uv.x, 1.0 - uv.y );",
          "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
          "}"
        ].join("\n"),
        fragmentShader: [
          "uniform sampler2D texture;",
          "varying vec2 vUV;",
          "void main() {",
          " gl_FragColor = texture2D( texture, vUV  )" +
            (Util.isIOS() ? ".bgra" : "") +
            ";",
          "}"
        ].join("\n")
      });
    } else {
      material = new THREE.MeshBasicMaterial({ map: texture });
    }

    const photosphere = new THREE.Mesh(geometry, material);
    // photosphere.visible = false;
    photosphere.renderOrder = -1;
    return photosphere;
  }

  private onTextureLoaded(texture: any) {
    let sphereLeft;
    let sphereRight;

    if (this.isStereo) {
      sphereLeft = this.createPhotosphere(texture, {
        offsetY: 0.5,
        scaleY: 0.5
      });
      sphereRight = this.createPhotosphere(texture, {
        offsetY: 0,
        scaleY: 0.5
      });
    } else {
      sphereLeft = this.createPhotosphere(texture);
      sphereRight = this.createPhotosphere(texture);
    }

    // Display in left and right eye respectively.
    sphereLeft.layers.set(EYE.LEFT);
    sphereLeft.name = "eyeLeft";
    sphereRight.layers.set(EYE.RIGHT);
    sphereRight.name = "eyeRight";

    this.sphereGroup.add(sphereLeft, sphereRight);
    this.resolve();
  }

  private onTextureError(error: string) {
    this.reject('Unable to load texture from "' + this.src + '"');
  }
}
