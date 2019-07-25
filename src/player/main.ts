import WebVRPolyfill from 'webvr-polyfill';
import Stats from "stats.js";
import TWEEN from "@tweenjs/tween.js";
import Util from "../shared/util";
import WorldRenderer from "./WorldRenderer";

new WebVRPolyfill();
const stats = new Stats();

const showStats = () => {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  // Align bottom-left.
  stats.dom.style.position = "absolute";
  stats.dom.style.left = "0px";
  stats.dom.style.bottom = "0px";
  document.body.appendChild(stats.dom);
};
showStats();

const worldRenderer = new WorldRenderer();
worldRenderer.on('load', onRenderLoad);
worldRenderer.on('error', onRenderError);
worldRenderer.on('modechange', onModeChange);
// worldRenderer.on('play', onPlay);
// worldRenderer.on('ended', onEnded);

worldRenderer.setScene({});
worldRenderer.renderer.setAnimationLoop((time: number) => {
  // console.log("position", worldRenderer.camera.position);
  stats.begin();
  TWEEN.update(time);
  worldRenderer.render();
  stats.end();
});

let isReadySent = false;

/**
 * World Events
 */
function onRenderLoad(event: any) {
  if (event.videoElement) {
    // const scene = SceneInfo.loadFromGetParams();
    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    if (Util.isMobile()) {
      // Tell user to tap to start.
      // showPlayButton();
      // document.body.addEventListener('touchend', onVideoTap);
    } else {
      event.videoElement.play();
    }
    
    // Attach to pause and play events, to notify the API.
    event.videoElement.addEventListener('play', onPlay);
    event.videoElement.addEventListener('pause', onPause);
    event.videoElement.addEventListener('timeupdate', onGetCurrentTime);
    event.videoElement.addEventListener('ended', onEnded);
  }
  // Hide loading indicator.
  // loadIndicator.hide();
  // Autopan only on desktop, for photos only, and only if autopan is enabled.
  if (!Util.isMobile() && !worldRenderer.sceneInfo.video && !worldRenderer.sceneInfo.isAutopanOff) {
    worldRenderer.autopan();
  }
  // Notify the API that we are ready, but only do this once.
  if (!isReadySent) {
    if (event.videoElement) {
      Util.sendParentMessage({
        type: 'ready',
        data: {
          duration: event.videoElement.duration
        }
      });
    } else {
      Util.sendParentMessage({
        type: 'ready'
      });
    }
    isReadySent = true;
  }
}

function onRenderError(message: string) {
  showError('Render: ' + message);
}

function onModeChange(mode: Object) {
  Util.sendParentMessage({
    type: 'modechange',
    data: {
      mode: mode
    }
  });
}

/**
 * Video Element Events
 */
function onPlay() {
  Util.sendParentMessage({
    type: 'paused',
    data: false
  });
}

function onPause() {
  Util.sendParentMessage({
    type: 'paused',
    data: true
  });
}

function onGetCurrentTime() {
  var time = worldRenderer.videoProxy.getCurrentTime();
  Util.sendParentMessage({
    type: 'timeupdate',
    data: time
  });
}

function onEnded() {
  Util.sendParentMessage({
    type: 'ended',
    data: true
  });
}


/**
 * Common
 */
function showError(message: string) {
  // Hide loading indicator.
  // loadIndicator.hide();
  // Sanitize `message` as it could contain user supplied
  // values. Re-add the space character as to not modify the
  // error messages used throughout the codebase.
  message = encodeURI(message).replace(/%20/g, ' ');
  var error = document.querySelector('#error');
  error.classList.add('visible');
  error.querySelector('.message').innerHTML = message;
  error.querySelector('.title').innerHTML = 'Error';
}