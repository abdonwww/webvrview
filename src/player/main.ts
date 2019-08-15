import WebVRPolyfill from 'webvr-polyfill';
import Stats from "stats.js";
import TWEEN from "@tweenjs/tween.js";
import { MESSAGE } from "../shared/constants";
import Util from "../shared/util";
import IFrameMessageReceiver from "./IFrameMessageReceiver";
import SceneInfo from "./SceneInfo";
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


const receiver = new IFrameMessageReceiver();
receiver.on(MESSAGE.PLAY, onPlayRequest);
receiver.on(MESSAGE.PAUSE, onPauseRequest);
receiver.on(MESSAGE.SET_CONTENT, onSetContent);
receiver.on(MESSAGE.SET_VOLUME, onSetVolume);
receiver.on(MESSAGE.MUTED, onMuted);
receiver.on(MESSAGE.SET_CURRENT_TIME, onUpdateCurrentTime);
receiver.on(MESSAGE.GET_POSITION, onGetPosition);
receiver.on(MESSAGE.SET_FULLSCREEN, onSetFullscreen);

const sceneInfo = SceneInfo.loadFromGetParams();
const worldRenderer = new WorldRenderer();
worldRenderer.on('sceneload', onSceneLoad);
worldRenderer.on('sceneerror', onSceneError);
worldRenderer.on('modechange', onModeChange);
worldRenderer.on('displayconnected', () => {});
worldRenderer.on('displayunconnected', () => {});
worldRenderer.on('displaynotfound', () => {});
worldRenderer.setScene(sceneInfo);
worldRenderer.renderer.setAnimationLoop((time: number) => {
  // console.log("position", worldRenderer.camera.position);
  stats.begin();
  TWEEN.update(time);
  worldRenderer.render();
  stats.end();
});

let isReadySent = false;


/**
 * IFrameMessageReceiver
 */
function onApiError(message: string) {
  console.error(message);
  Util.sendParentMessage({
    type: 'error',
    data: {
      message: message
    }
  });
}

function onPlayRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.play();
}

function onPauseRequest() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.pause();
}

function onSetContent(e: any) {
  if (Util.isDebug()) {
    console.log('onSetContent', e);
  }

  // Fade to black.
  worldRenderer.sphereRenderer.setOpacity(0, 500).then(function() {
    // Then load the new scene.
    var scene = SceneInfo.loadFromAPIParams(e.contentInfo);
    worldRenderer.destroy();
    // Update the URL to reflect the new scene. This is important particularily
    // on iOS where we use a fake fullscreen mode.
    var url = scene.getCurrentUrl();
    //console.log('Updating url to be %s', url);
    window.history.pushState(null, 'VR View', url);
    // And set the new scene.
    return worldRenderer.setScene(scene);
  }).then(function() {
    // Then fade the scene back in.
    worldRenderer.sphereRenderer.setOpacity(1, 500);
  });
}

function onSetVolume(e: any) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set volume, but no video found.');
    return;
  }
  worldRenderer.videoProxy.setVolume(e.volumeLevel);
  Util.sendParentMessage({
    type: 'volumechange',
    data: e.volumeLevel
  });
}

function onMuted(e: any) {
  // Only work for video. If there's no video, send back an error.
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to mute, but no video found.');
    return;
  }
  worldRenderer.videoProxy.mute(e.muteState);
  Util.sendParentMessage({
    type: 'muted',
    data: e.muteState
  });
}

function onUpdateCurrentTime(time: number) {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to pause, but no video found.');
    return;
  }
  worldRenderer.videoProxy.setCurrentTime(time);
  onGetCurrentTime();
}

function onGetPosition() {
  Util.sendParentMessage({
    type: 'getposition',
    data: {
      Yaw: worldRenderer.camera.rotation.y * 180 / Math.PI,
      Pitch: worldRenderer.camera.rotation.x * 180 / Math.PI
    }
  });
}

function onSetFullscreen() {
  if (!worldRenderer.videoProxy) {
    onApiError('Attempt to set fullscreen, but no video found.');
    return;
  }
  // worldRenderer.manager.onFSClick_();
}

/**
 * World Events
 */
function onSceneLoad(event: any) {
  if (event.videoElement) {
    // const scene = SceneInfo.loadFromGetParams();

    // Attach to pause and play events, to notify the API.
    event.videoElement.addEventListener('play', onPlay);
    event.videoElement.addEventListener('pause', onPause);
    event.videoElement.addEventListener('timeupdate', onGetCurrentTime);
    event.videoElement.addEventListener('ended', onEnded);

    // On mobile, tell the user they need to tap to start. Otherwise, autoplay.
    // if (Util.isMobile()) {
    //   // Tell user to tap to start.
    //   showPlayButton();
    //   document.body.addEventListener('touchend', onVideoTap);
    // } else {
    //   event.videoElement.play();
    // }

    showPlayButton();
    document.body.addEventListener('touchend', onVideoTap);
    document.body.addEventListener('click', onVideoTap);
  }
  // Hide loading indicator.
  // loadIndicator.hide();

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

function onSceneError(message: string) {
  showError('Scene: ' + message);
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
 * Play Button
 */
function onVideoTap() {
  worldRenderer.videoProxy.play();
  hidePlayButton();

  // Prevent multiple play() calls on the video element.
  document.body.removeEventListener('touchend', onVideoTap);
  document.body.removeEventListener('click', onVideoTap);
}

function showPlayButton() {
  const playButton = document.querySelector('#play-overlay');
  playButton.classList.add('visible');
}

function hidePlayButton() {
  const playButton = document.querySelector('#play-overlay');
  playButton.classList.remove('visible');
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