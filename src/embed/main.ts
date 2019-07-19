// import WebVRPolyfill from "webvr-polyfill";
import WebVRPolyfill from 'webvr-polyfill';
import Stats from "stats.js";
import LoadingIndicator from "./loading-indicator";
import WorldRenderer from "./world-renderer";
import IFrameMessageReceiver from "./iframe-message-receiver";
import SceneInfo from "./scene-info";
import { MESSAGE } from "../shared/constants";
import Util from "../shared/util";

new WebVRPolyfill();
const loadIndicator = new LoadingIndicator();

// const receiver = new IFrameMessageReceiver();
// receiver.on(MESSAGE.PLAY, onPlayRequest);
// receiver.on(MESSAGE.PAUSE, onPauseRequest);
// receiver.on(MESSAGE.ADD_HOTSPOT, onAddHotspot);
// receiver.on(MESSAGE.SET_CONTENT, onSetContent);
// receiver.on(MESSAGE.SET_VOLUME, onSetVolume);
// receiver.on(MESSAGE.MUTED, onMuted);
// receiver.on(MESSAGE.SET_CURRENT_TIME, onUpdateCurrentTime);
// receiver.on(MESSAGE.GET_POSITION, onGetPosition);
// receiver.on(MESSAGE.SET_FULLSCREEN, onSetFullscreen);

const stats = new Stats();
const scene = SceneInfo.loadFromGetParams();
const worldRenderer = new WorldRenderer(scene);
worldRenderer.on('error', onRenderError);
worldRenderer.on('load', onRenderLoad);
worldRenderer.on('modechange', onModeChange);
worldRenderer.on('ended', onEnded);
worldRenderer.on('play', onPlay);
// worldRenderer.hotspotRenderer.on('click', onHotspotClick);

let isReadySent = false;
window.addEventListener('load', onLoad);

function onLoad() {
  if (!Util.isWebGLEnabled()) {
    showError('WebGL not supported.');
    return;
  }
  // Load the scene.
  worldRenderer.setScene(scene);
  if (scene.isDebug) {
    // Show stats.
    showStats();
  }
  if (scene.isYawOnly) {
    const WebVRConfig = window.WebVRConfig || {};
    WebVRConfig.YAW_ONLY = true;
  }
//   requestAnimationFrame(loop);

  worldRenderer.renderer.setAnimationLoop((time: number) => {
    // console.log(time);
    // worldRenderer.renderer.render(worldRenderer.scene, worldRenderer.camera);
    worldRenderer.render(time);
    worldRenderer.submitFrame();
  });
}

function loop(time: number) {
  // Use the VRDisplay RAF if it is present.
  if (worldRenderer.vrDisplay) {
    worldRenderer.vrDisplay.requestAnimationFrame(loop);
  } else {
    requestAnimationFrame(loop);
  }
  stats.begin();
  // Update the video if needed.
  if (worldRenderer.videoProxy) {
    worldRenderer.videoProxy.update();
  }
  worldRenderer.render(time);
  worldRenderer.submitFrame();
  stats.end();
}

function onVideoTap() {
  worldRenderer.videoProxy.play();
  hidePlayButton();
  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
}

function onRenderLoad(event: any) {
  if (event.videoElement) {
    // const scene = SceneInfo.loadFromGetParams();
    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    if (Util.isMobile()) {
      // Tell user to tap to start.
      showPlayButton();
      document.body.addEventListener('touchend', onVideoTap);
    } else {
      event.videoElement.play();
    }
    
    // Attach to pause and play events, to notify the API.
    event.videoElement.addEventListener('pause', onPause);
    event.videoElement.addEventListener('play', onPlay);
    event.videoElement.addEventListener('timeupdate', onGetCurrentTime);
    event.videoElement.addEventListener('ended', onEnded);
  }
  // Hide loading indicator.
  loadIndicator.hide();
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
/**
 * IFrameMessageReceiver
 */
// function onPlayRequest() {
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to pause, but no video found.');
//     return;
//   }
//   worldRenderer.videoProxy.play();
// }
// function onPauseRequest() {
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to pause, but no video found.');
//     return;
//   }
//   worldRenderer.videoProxy.pause();
// }
// function onAddHotspot(e: any) {
//   if (Util.isDebug()) {
//     console.log('onAddHotspot', e);
//   }
//   // TODO: Implement some validation?
//   var pitch = parseFloat(e.pitch);
//   var yaw = parseFloat(e.yaw);
//   var radius = parseFloat(e.radius);
//   var distance = parseFloat(e.distance);
//   var id = e.id;
//   worldRenderer.hotspotRenderer.add(pitch, yaw, radius, distance, id);
// }
// function onSetContent(e: any) {
//   if (Util.isDebug()) {
//     console.log('onSetContent', e);
//   }
//   // Remove all of the hotspots.
//   worldRenderer.hotspotRenderer.clearAll();
//   // Fade to black.
//   worldRenderer.sphereRenderer.setOpacity(0, 500).then(function() {
//     // Then load the new scene.
//     var scene = SceneInfo.loadFromAPIParams(e.contentInfo);
//     worldRenderer.destroy();
//     // Update the URL to reflect the new scene. This is important particularily
//     // on iOS where we use a fake fullscreen mode.
//     var url = scene.getCurrentUrl();
//     //console.log('Updating url to be %s', url);
//     window.history.pushState(null, 'VR View', url);
//     // And set the new scene.
//     return worldRenderer.setScene(scene);
//   }).then(function() {
//     // Then fade the scene back in.
//     worldRenderer.sphereRenderer.setOpacity(1, 500);
//   });
// }
// function onSetVolume(e: any) {
//   // Only work for video. If there's no video, send back an error.
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to set volume, but no video found.');
//     return;
//   }
//   worldRenderer.videoProxy.setVolume(e.volumeLevel);
// //   volume = e.volumeLevel;
//   Util.sendParentMessage({
//     type: 'volumechange',
//     data: e.volumeLevel
//   });
// }
// function onMuted(e: any) {
//   // Only work for video. If there's no video, send back an error.
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to mute, but no video found.');
//     return;
//   }
//   worldRenderer.videoProxy.mute(e.muteState);
//   Util.sendParentMessage({
//     type: 'muted',
//     data: e.muteState
//   });
// }
// function onUpdateCurrentTime(time: number) {
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to pause, but no video found.');
//     return;
//   }
//   worldRenderer.videoProxy.setCurrentTime(time);
//   onGetCurrentTime();
// }
// function onGetPosition() {
//     Util.sendParentMessage({
//         type: 'getposition',
//         data: {
//             Yaw: worldRenderer.camera.rotation.y * 180 / Math.PI,
//             Pitch: worldRenderer.camera.rotation.x * 180 / Math.PI
//         }
//     });
// }
// function onSetFullscreen() {
//   if (!worldRenderer.videoProxy) {
//     onApiError('Attempt to set fullscreen, but no video found.');
//     return;
//   }
//   worldRenderer.manager.onFSClick_();
// }
/**
 * WorldRenderer
 */
function onGetCurrentTime() {
  var time = worldRenderer.videoProxy.getCurrentTime();
  Util.sendParentMessage({
    type: 'timeupdate',
    data: time
  });
}

function onApiError(message: string) {
  console.error(message);
  Util.sendParentMessage({
    type: 'error',
    data: {
      message: message
    }
  });
}

function onModeChange(mode: Object) {
  Util.sendParentMessage({
    type: 'modechange',
    data: {
      mode: mode
    }
  });
}
// function onHotspotClick(id: string) {
//   Util.sendParentMessage({
//     type: 'click',
//     data: { id: id }
//   });
// }
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

function onEnded() {
  Util.sendParentMessage({
    type: 'ended',
    data: true
  });
}

function onSceneError(message: string) {
  showError('Loader: ' + message);
}

function onRenderError(message: string) {
  showError('Render: ' + message);
}

function showError(message: string) {
  // Hide loading indicator.
  loadIndicator.hide();
  // Sanitize `message` as it could contain user supplied
  // values. Re-add the space character as to not modify the
  // error messages used throughout the codebase.
  message = encodeURI(message).replace(/%20/g, ' ');
  var error = document.querySelector('#error');
  error.classList.add('visible');
  error.querySelector('.message').innerHTML = message;
  error.querySelector('.title').innerHTML = 'Error';
}

function hideError() {
  var error = document.querySelector('#error');
  error.classList.remove('visible');
}

function showPlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.add('visible');
}

function hidePlayButton() {
  var playButton = document.querySelector('#play-overlay');
  playButton.classList.remove('visible');
}

function showStats() {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  // Align bottom-left.
  stats.dom.style.position = 'absolute';
  stats.dom.style.left = '0px';
  stats.dom.style.bottom = '0px';
  document.body.appendChild(stats.dom);
}