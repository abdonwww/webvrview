
import { EventEmitter } from 'eventemitter3';
import shaka from 'shaka-player';
import { VIDEO_TYPE } from "../shared/constants";
import Util from "../shared/util";

/**
 * Supports regular video URLs (eg. mp4), as well as adaptive manifests like
 * DASH (.mpd) and soon HLS (.m3u8).
 *
 * Events:
 *   load(video): When the video is loaded.
 *   error(message): If an error occurs.
 *
 * To play/pause/seek/etc, please use the underlying video element.
 */

interface Params {
  loop: boolean;
  volume: number;
  muted: boolean;
}

const DEFAULT_BITS_PER_SECOND = 1000000;

export default class AdaptivePlayer extends EventEmitter {
  video: HTMLVideoElement;
  type: number;
  player: any;

  constructor(params: Params) {
    super();

    this.video = document.createElement('video');
    // Loop by default.
    if (params.loop === true) {
      this.video.setAttribute("loop", "true");
    }

    if (params.volume !== undefined) {
      // XXX: .setAttribute('volume', params.volume) doesn't work for some reason.
      this.video.volume = params.volume;
    }

    // Not muted by default.
    if (params.muted === true) {
      this.video.muted = params.muted;
    }

    // For FF, make sure we enable preload.
    this.video.setAttribute('preload', 'auto');
    // Enable inline video playback in iOS 10+.
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('crossorigin', 'anonymous');
  }

  load(url: string) {
    // TODO(smus): Investigate whether or not differentiation is best done by
    // mimeType after all. Cursory research suggests that adaptive streaming
    // manifest mime types aren't properly supported.
    //
    // For now, make determination based on extension.
    const extension = Util.getExtension(url);
    switch (extension) {
      case "m3u8": // HLS
        this.type = VIDEO_TYPE.HLS;
        if (Util.isSafari()) {
          this.loadVideo(url)
            .then(() => {
              this.emit("load", this.video, this.type);
            })
            .catch(this.onError.bind(this));
        } else {
          this.onError("HLS is only supported on Safari.");
        }
        break;
      case "mpd": // MPEG-DASH
        this.type = VIDEO_TYPE.DASH;
        this.loadShakaVideo(url)
          .then(() => {
            console.log("The video has now been loaded!");
            this.emit("load", this.video, this.type);
          })
          .catch(this.onError.bind(this));
        break;
      default:
        // A regular video, not an adaptive manifest.
        this.type = VIDEO_TYPE.VIDEO;
        this.loadVideo(url)
          .then(() => {
            this.emit("load", this.video, this.type);
          })
          .catch(this.onError.bind(this));
        break;
    }
  }

  destroy() {
    this.video.pause();
    this.video.src = "";
    this.video = null;
  }

  private onError(errorMessage: string) {
    console.error(errorMessage);
    this.emit("error", errorMessage);
  }

  private loadVideo(url: string) {
    const video = this.video;

    return new Promise((resolve, reject) => {
      video.src = url;
      video.addEventListener("canplaythrough", resolve);
      video.addEventListener("loadedmetadata", () => {
        this.emit("timeupdate", {
          currentTime: video.currentTime,
          duration: video.duration
        });
      });
      video.addEventListener('error', reject);
      video.load();
    });
  }

  private initShaka() {
    this.player = new shaka.Player(this.video);
  
    this.player.configure({
      abr: { defaultBandwidthEstimate: DEFAULT_BITS_PER_SECOND }
    });
  
    // Listen for error events.
    this.player.addEventListener('error', this.onError);
  }

  private loadShakaVideo(url: string) {
    // Install built-in polyfills to patch browser incompatibilities.
    shaka.polyfill.installAll();
  
    if (!shaka.Player.isBrowserSupported()) {
      console.error('Shaka is not supported on this browser.');
      return;
    }
    this.initShaka();
    return this.player.load(url);
  }
}
