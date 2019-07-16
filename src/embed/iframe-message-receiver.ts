import { EventEmitter } from 'eventemitter3';
import Message from '../message';
import Util from '../util';

/**
 * Sits in an embedded iframe, receiving messages from a containing
 * iFrame. This facilitates an API which provides the following features:
 *
 *    Playing and pausing content.
 *    Adding hotspots.
 *    Sending messages back to the containing iframe when hotspot is clicked
 *    Sending analytics events to containing iframe.
 *
 * Note: this script used to also respond to synthetic devicemotion events, but
 * no longer does so. This is because as of iOS 9.2, Safari disallows listening
 * for devicemotion events within cross-device iframes. To work around this, the
 * webvr-polyfill responds to the postMessage event containing devicemotion
 * information (sent by the iframe-message-sender in the VR View API).
 */

export default class IFrameMessageReceiver extends EventEmitter {
  constructor() {
    super();
    window.addEventListener('message', this.onMessage_.bind(this), false);
  }

  onMessage_(event: any) {
    if (Util.isDebug()) {
      console.log('onMessage_', event);
    }
  
    var message = event.data;
    var type = message.type.toLowerCase();
    var data = message.data;
  
    switch (type) {
      case Message.SET_CONTENT:
      case Message.SET_VOLUME:
      case Message.MUTED:
      case Message.ADD_HOTSPOT:
      case Message.PLAY:
      case Message.PAUSE:
      case Message.SET_CURRENT_TIME:
      case Message.GET_POSITION:
      case Message.SET_FULLSCREEN:
        this.emit(type, data);
        break;
      default:
        if (Util.isDebug()) {
          console.warn('Got unknown message of type %s from %s', message.type, message.origin);
        }
    }
  }     
}
