import * as THREE from 'three';
import Util from "../shared/util";

interface Params {
  video: string;
  image: string;
  preview: string;
  volume: number | string;
  loop: boolean | number | string;
  muted: boolean | number | string;
  isStereo: boolean | number | string;
  isDebug: boolean | number | string;
  defaultYaw: number | string;
}

export default class SceneInfo {
  properties: {
    [key: string]: boolean | number | string | null;
    video: string | null; // ex.) "/assets/dash/richoh1_0.mpd",
    image: string | null; // ex.) "/assets/gallery/taj-mahal.jpg",
    preview: string | null;
    volume: number; // 0 - 1
    loop: boolean;
    muted: boolean; // autoplay throw DOMExeption if muted property is false
    isStereo: boolean;
    isDebug: boolean;
    defaultYaw: number;
  };
  errorMessage: string;

  static QUERIES = [
    'video',
    'image',
    'preview',
    'loop',
    'volume',
    'muted',
    'is_stereo',
    'is_debug',
    'default_yaw',
  ];

  constructor(params: Params) {
    this.properties = {
      video: params.video ? encodeURI(params.video) : null,
      image: params.image ? encodeURI(params.image) : null,
      preview: params.preview ? encodeURI(params.preview) : null,
      volume: params.volume ? (typeof params.volume === 'string' ? parseFloat(params.volume) : params.volume) : 1,
      loop: Util.parseBoolean(params.loop),
      muted: Util.parseBoolean(params.muted),
      isStereo: Util.parseBoolean(params.isStereo),
      isDebug: Util.parseBoolean(params.isDebug),
      defaultYaw: THREE.Math.degToRad(Number(params.defaultYaw) || 0),
    };
  }

  get video() {
    return this.properties.video;
  }

  get image() {
    return this.properties.image;
  }

  get preview() {
    return this.properties.preview;
  }

  get volume() {
    return this.properties.volume;
  }

  get loop() {
    return this.properties.loop;
  }

  get muted() {
    return this.properties.muted;
  }

  get isStereo() {
    return this.properties.isStereo;
  }

  get isDebug() {
    return this.properties.isDebug;
  }

  get defaultYaw() {
    return this.properties.defaultYaw;
  }

  static loadFromGetParams() {
    const params = <any>{};

    SceneInfo.QUERIES.forEach((query: string) => {
      params[Util.snakeToCamel(query)] = Util.getQueryParameter(query) || (window.WebVRConfig ? window.WebVRConfig[query] : null);
    });

    const scene = new SceneInfo(params);
    if (!scene.isValid()) {
      console.warn('Invalid scene: %s', scene.errorMessage);
    }
    return scene;
  }

  static loadFromAPIParams(queryParams: any) {
    const params = <any>{};

    SceneInfo.QUERIES.forEach((query: string) => {
      if (queryParams[query]) {
        params[Util.snakeToCamel(query)] = queryParams[query];
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
    if (!this.properties.image && !this.properties.video) {
      this.errorMessage = 'Either image or video URL must be specified.';
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

    SceneInfo.QUERIES.forEach((query: string) => {
      const value = this.properties[Util.snakeToCamel(query)];

      if (value !== undefined) {
        url += query + '=' + value + '&';
      }
    });

    // Chop off the trailing ampersand.
    return url.substring(0, url.length - 1);
  }
}
