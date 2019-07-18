import * as THREE from 'three';
import Util from "../shared/util";

// const CAMEL_TO_UNDERSCORE = <any>{
//   video: 'video',
//   image: 'image',
//   preview: 'preview',
//   loop: 'loop',
//   volume: 'volume',
//   muted: 'muted',
//   isStereo: 'is_stereo',
//   isYawOnly: 'is_yaw_only',
//   isDebug: 'is_debug',
//   isVROff: 'is_vr_off',
//   isAutopanOff: 'is_autopan_off',
//   defaultYaw: 'default_yaw',
//   hideFullscreenButton: 'hide_fullscreen_button'
// };

/**
 * Contains all information about a given scene.
 */
export default class SceneInfo {
  video: string;
  image: string;
  preview: string;
  loop: boolean;
  volume: number;
  muted: boolean;
  isStereo: boolean;
  isYawOnly: boolean;
  isDebug: boolean;
  isVROff: boolean;
  isAutopanOff: boolean;
  defaultYaw: number;
  hideFullscreenButton: boolean;
  errorMessage: string;

  static CAMEL_TO_UNDERSCORE = <any>{
    video: 'video',
    image: 'image',
    preview: 'preview',
    loop: 'loop',
    volume: 'volume',
    muted: 'muted',
    isStereo: 'is_stereo',
    isYawOnly: 'is_yaw_only',
    isDebug: 'is_debug',
    isVROff: 'is_vr_off',
    isAutopanOff: 'is_autopan_off',
    defaultYaw: 'default_yaw',
    hideFullscreenButton: 'hide_fullscreen_button'
  };

  constructor(opt_params: any) {
    const params = opt_params || {};
    params.player = {
      loop: opt_params.loop,
      volume: opt_params.volume,
      muted: opt_params.muted
    };
  
    this.video = params.video !== undefined ? encodeURI(params.video) : undefined;
    this.image = params.image !== undefined ? encodeURI(params.image) : undefined;
    this.preview = params.preview !== undefined ? encodeURI(params.preview) : undefined;
    this.loop = Util.parseBoolean(params.player.loop);
    this.volume = parseFloat(params.player.volume ? params.player.volume : '1');
    this.muted = Util.parseBoolean(params.player.muted);
    this.isStereo = Util.parseBoolean(params.isStereo);
    this.isYawOnly = Util.parseBoolean(params.isYawOnly);
    this.isDebug = Util.parseBoolean(params.isDebug);
    this.isVROff = Util.parseBoolean(params.isVROff);
    this.isAutopanOff = Util.parseBoolean(params.isAutopanOff);
    this.defaultYaw = THREE.Math.degToRad(params.defaultYaw || 0);
    this.hideFullscreenButton = Util.parseBoolean(params.hideFullscreenButton);
  }

  static loadFromGetParams() {
    const params = <any>{};

    Object.keys(SceneInfo.CAMEL_TO_UNDERSCORE).forEach((camelCase: any) => {
      const underscore = SceneInfo.CAMEL_TO_UNDERSCORE[camelCase];
      params[camelCase] = Util.getQueryParameter(underscore) || ((window.WebVRConfig && window.WebVRConfig.PLAYER) ? window.WebVRConfig.PLAYER[underscore] : "");
    });

    const scene = new SceneInfo(params);
    if (!scene.isValid()) {
      console.warn('Invalid scene: %s', scene.errorMessage);
    }
    return scene;
  }

  static loadFromAPIParams(underscoreParams: any) {
    const params = <any>{};
    
    Object.keys(SceneInfo.CAMEL_TO_UNDERSCORE).forEach((camelCase: any) => {
      const underscore = SceneInfo.CAMEL_TO_UNDERSCORE[camelCase];
      if (underscoreParams[underscore]) {
        params[camelCase] = underscoreParams[underscore];
      }
    });

    const scene = new SceneInfo(params);
    if (!scene.isValid()) {
      console.warn('Invalid scene: %s', scene.errorMessage);
    }
    return scene;
  }

  isValid() {
    // Either it's an image or a video.
    if (!this.image && !this.video) {
      this.errorMessage = 'Either image or video URL must be specified.';
      return false;
    }
    if (this.image && !this.isValidImage_(this.image)) {
      this.errorMessage = 'Invalid image URL: ' + this.image;
      return false;
    }
    this.errorMessage = null;
    return true;
  }

  /**
   * Generates a URL to reflect this scene.
   */
  getCurrentUrl() {
    let url = location.protocol + '//' + location.host + location.pathname + '?';

    Object.keys(SceneInfo.CAMEL_TO_UNDERSCORE).forEach((camelCase: any) => {
      const underscore = SceneInfo.CAMEL_TO_UNDERSCORE[camelCase];
      // const value = this[camelCase];
      const value = '';

      if (value !== undefined) {
        url += underscore + '=' + value + '&';
      }
    });

    // Chop off the trailing ampersand.
    return url.substring(0, url.length - 1);
  }

  isValidImage_(imageUrl: string) {
    console.log(imageUrl);
    return true;
  }
}
