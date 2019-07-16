import * as THREE from 'three';
import Util from '../util';

const CAMEL_TO_UNDERSCORE = {
  video: 'video',
  image: 'image',
  preview: 'preview',
  loop: 'loop',
  volume: 'volume',
  muted: 'muted',
  isStereo: 'is_stereo',
  defaultYaw: 'default_yaw',
  isYawOnly: 'is_yaw_only',
  isDebug: 'is_debug',
  isVROff: 'is_vr_off',
  isAutopanOff: 'is_autopan_off',
  hideFullscreenButton: 'hide_fullscreen_button'
};

/**
 * Contains all information about a given scene.
 */
export default class SceneInfo {
  image: string;
  preview: string;
  video: string;
  defaultYaw: number;
  isStereo: boolean;
  isYawOnly: boolean;
  isDebug: boolean;
  isVROff: boolean;
  isAutopanOff: boolean;
  loop: boolean;
  volume: number;
  muted: boolean;
  hideFullscreenButton: boolean;

  constructor(opt_params: any) {
    var params = opt_params || {};
    params.player = {
      loop: opt_params.loop,
      volume: opt_params.volume,
      muted: opt_params.muted
    };
  
    this.image = params.image !== undefined ? encodeURI(params.image) : undefined;
    this.preview = params.preview !== undefined ? encodeURI(params.preview) : undefined;
    this.video = params.video !== undefined ? encodeURI(params.video) : undefined;
    this.defaultYaw = THREE.Math.degToRad(params.defaultYaw || 0);
  
    this.isStereo = Util.parseBoolean(params.isStereo);
    this.isYawOnly = Util.parseBoolean(params.isYawOnly);
    this.isDebug = Util.parseBoolean(params.isDebug);
    this.isVROff = Util.parseBoolean(params.isVROff);
    this.isAutopanOff = Util.parseBoolean(params.isAutopanOff);
    this.loop = Util.parseBoolean(params.player.loop);
    this.volume = parseFloat(params.player.volume ? params.player.volume : '1');
    this.muted = Util.parseBoolean(params.player.muted);
    this.hideFullscreenButton = Util.parseBoolean(params.hideFullscreenButton);
  }

  static loadFromGetParams() {
    var params = {};
    for (var camelCase in CAMEL_TO_UNDERSCORE) {
      var underscore = CAMEL_TO_UNDERSCORE[camelCase];
      params[camelCase] = Util.getQueryParameter(underscore)
                          || ((window.WebVRConfig && window.WebVRConfig.PLAYER) ? window.WebVRConfig.PLAYER[underscore] : "");
    }
    var scene = new SceneInfo(params);
    if (!scene.isValid()) {
      console.warn('Invalid scene: %s', scene.errorMessage);
    }
    return scene;
  }

  static loadFromAPIParams(underscoreParams) {
    var params = {};
    for (var camelCase in CAMEL_TO_UNDERSCORE) {
      var underscore = CAMEL_TO_UNDERSCORE[camelCase];
      if (underscoreParams[underscore]) {
        params[camelCase] = underscoreParams[underscore];
      }
    }
    var scene = new SceneInfo(params);
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
    var url = location.protocol + '//' + location.host + location.pathname + '?';
    for (var camelCase in CAMEL_TO_UNDERSCORE) {
      var underscore = CAMEL_TO_UNDERSCORE[camelCase];
      var value = this[camelCase];
      if (value !== undefined) {
        url += underscore + '=' + value + '&';
      }
    }
    // Chop off the trailing ampersand.
    return url.substring(0, url.length - 1);
  }

  isValidImage_(imageUrl) {
    return true;
  }
}
