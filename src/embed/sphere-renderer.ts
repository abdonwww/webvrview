import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import Eyes from './eyes';
import VideoType from './video-type';
import Util from '../util';

export default class SphereRenderer {
  scene: any;
  src: string;
  isStereo: boolean;
  resolve: Function;
  reject: Function;

  constructor(scene: any) {
    this.scene = scene;

    // Create a transparent mask.
    this.createOpacityMask_();
  }

  /**
   * Sets the photosphere based on the image in the source. Supports stereo and
   * mono photospheres.
   *
   * @return {Promise}
   */
  setPhotosphere(src: string, opt_params: any) {
    return new Promise((resolve: Function, reject: Function) => {
      this.resolve = resolve;
      this.reject = reject;
  
      var params = opt_params || {};
  
      this.isStereo = !!params.isStereo;
      this.src = src;
  
      // Load texture.
      var loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(src, this.onTextureLoaded_.bind(this), undefined, this.onTextureError_.bind(this));
    });
  }

  /**
   * @return {Promise} Yeah.
   */

  set360Video(videoElement: any, videoType: number, opt_params: any) {
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
  
      if (Util.isSafari() && videoType === VideoType.HLS) {
        // fix black screen issue on safari
        videoTexture.format = THREE.RGBAFormat;
        videoTexture.flipY = false;
      } else {
        videoTexture.format = THREE.RGBFormat;
      }
  
      videoTexture.needsUpdate = true;
  
      this.onTextureLoaded_(videoTexture);
    });
  }

  /**
   * Set the opacity of the panorama.
   *
   * @param {Number} opacity How opaque we want the panorama to be. 0 means black,
   * 1 means full color.
   * @param {Number} duration Number of milliseconds the transition should take.
   *
   * @return {Promise} When the opacity change is complete.
   */
  setOpacity(opacity: number, duration: number) {
    const scene = this.scene;
    // If we want the opacity
    const overlayOpacity = 1 - opacity;
    return new Promise((resolve: Function) => {
      const mask = scene.getObjectByName('opacityMask');
      const tween = new TWEEN.Tween({ opacity: mask.material.opacity })
          .to({ opacity: overlayOpacity }, duration)
          .easing(TWEEN.Easing.Quadratic.InOut);
      tween.onUpdate(function(e) {
        mask.material.opacity = this.opacity;
      });
      tween.onComplete(resolve).start();
    });
  }

  onTextureLoaded_(texture: any) {
    var sphereLeft;
    var sphereRight;
    if (this.isStereo) {
      sphereLeft = this.createPhotosphere_(texture, {offsetY: 0.5, scaleY: 0.5});
      sphereRight = this.createPhotosphere_(texture, {offsetY: 0, scaleY: 0.5});
    } else {
      sphereLeft = this.createPhotosphere_(texture);
      sphereRight = this.createPhotosphere_(texture);
    }
  
    // Display in left and right eye respectively.
    sphereLeft.layers.set(Eyes.LEFT);
    sphereLeft.eye = Eyes.LEFT;
    sphereLeft.name = 'eyeLeft';
    sphereRight.layers.set(Eyes.RIGHT);
    sphereRight.eye = Eyes.RIGHT;
    sphereRight.name = 'eyeRight';
  
    this.scene.getObjectByName('photo').children = [sphereLeft, sphereRight];
    this.resolve();
  }

  onTextureError_(error: string) {
    this.reject('Unable to load texture from "' + this.src + '"');
  }

  createPhotosphere_(texture: any, opt_params: any = {}) {
    var p = opt_params;
    p.scaleX = p.scaleX || 1;
    p.scaleY = p.scaleY || 1;
    p.offsetX = p.offsetX || 0;
    p.offsetY = p.offsetY || 0;
    p.phiStart = p.phiStart || 0;
    p.phiLength = p.phiLength || Math.PI * 2;
    p.thetaStart = p.thetaStart || 0;
    p.thetaLength = p.thetaLength || Math.PI;
  
    var geometry = new THREE.SphereGeometry(1, 48, 48, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));
    var uvs = geometry.faceVertexUvs[0];
    for (var i = 0; i < uvs.length; i ++) {
      for (var j = 0; j < 3; j ++) {
        uvs[i][j].x *= p.scaleX;
        uvs[i][j].x += p.offsetX;
        uvs[i][j].y *= p.scaleY;
        uvs[i][j].y += p.offsetY;
      }
    }
  
    var material;
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
          " gl_FragColor = texture2D( texture, vUV  )" + (Util.isIOS() ? ".bgra" : "") + ";",
          "}"
        ].join("\n")
      });
    } else {
      material = new THREE.MeshBasicMaterial({ map: texture });
    }
    var out = new THREE.Mesh(geometry, material);
    //out.visible = false;
    out.renderOrder = -1;
    return out;
  }

  createOpacityMask_() {
    const geometry = new THREE.SphereGeometry(0.49, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide,
      opacity: 0,
      transparent: true
    });
    const opacityMask = new THREE.Mesh(geometry, material);
    opacityMask.name = 'opacityMask';
    opacityMask.renderOrder = 1;
  
    this.scene.add(opacityMask);
    return opacityMask;
  }
}

