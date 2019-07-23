import WebVRPolyfill from 'webvr-polyfill';
import Stats from "stats.js";
import TWEEN from "@tweenjs/tween.js";
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
worldRenderer.setScene({});
worldRenderer.renderer.setAnimationLoop((time: number) => {
  // console.log("position", worldRenderer.camera.position);
  stats.begin();
  TWEEN.update(time);
  worldRenderer.render();
  stats.end();
});
