import { MESSAGE } from "../shared/constants";

/**
 * Sends events to the embedded VR view IFrame via postMessage. Also handles
 * messages sent back from the IFrame:
 *
 *    click: When a hotspot was clicked.
 *    modechange: When the user changes viewing mode (VR|Fullscreen|etc).
 */

export default class IFrameMessageSender {
  iframe: HTMLIFrameElement;

  constructor(iframe: HTMLIFrameElement) {
    if (!iframe) {
      console.error('No iframe specified');
      return;
    }
    this.iframe = iframe;

    // On iOS, if the iframe is across domains, also send DeviceMotion data.
    if (this.isIOS_()) {
      window.addEventListener('devicemotion', this.onDeviceMotion_.bind(this), false);
    }
  }

  /**
   * Sends a message to the associated VR View IFrame.
   */
  send(message: Object) {
    var iframeWindow = this.iframe.contentWindow;
    iframeWindow.postMessage(message, '*');
  };

  onDeviceMotion_(e: any) {
    var message = {
      type: MESSAGE.DEVICE_MOTION,
      deviceMotionEvent: this.cloneDeviceMotionEvent_(e)
    };

    this.send(message);
  }

  cloneDeviceMotionEvent_(e: any) {
    return {
      acceleration: {
        x: e.acceleration.x,
        y: e.acceleration.y,
        z: e.acceleration.z,
      },
      accelerationIncludingGravity: {
        x: e.accelerationIncludingGravity.x,
        y: e.accelerationIncludingGravity.y,
        z: e.accelerationIncludingGravity.z,
      },
      rotationRate: {
        alpha: e.rotationRate.alpha,
        beta: e.rotationRate.beta,
        gamma: e.rotationRate.gamma,
      },
      interval: e.interval,
      timeStamp: e.timeStamp
    };
  };

  isIOS_() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }
}